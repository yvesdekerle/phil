"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { localToUtcIso } from "@/lib/events/datetime";
import { TRANSPORT_MODES } from "@/lib/events/transport";
import type { ActionState } from "@/lib/forms/action-state";
import { geolocateEvent } from "@/lib/geo/locate";
import { getT } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";
import { isAllowedMimeType, MAX_FILE_SIZE_BYTES } from "@/lib/vault/upload";

const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

type Translate = Awaited<ReturnType<typeof getT>>;

const eventFieldsSchema = (t: Translate) => ({
  tripId: z.string().uuid(),
  kind: z.enum(["TRANSPORT", "LODGING", "ACTIVITY"]),
  title: z.string().trim().min(1, t("events.msg.eventTitleRequired")).max(150),
  startsAtLocal: z.string().regex(DATETIME_LOCAL, t("events.msg.startRequired")),
  endsAtLocal: z.union([z.literal(""), z.string().regex(DATETIME_LOCAL)]).optional(),
  timezone: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz), {
    message: t("events.msg.timezoneUnknown"),
  }),
  locationName: z.string().trim().max(150).optional(),
  locationAddress: z.string().trim().max(300).optional(),
  from: z.string().trim().max(120).optional(),
  to: z.string().trim().max(120).optional(),
  transportMode: z.union([z.literal(""), z.enum(TRANSPORT_MODES)]).optional(),
  carrier: z.string().trim().max(120).optional(),
  bookingReference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
});

type EventFields = z.infer<z.ZodObject<ReturnType<typeof eventFieldsSchema>>>;

function eventFieldsFrom(formData: FormData): Record<string, FormDataEntryValue | string> {
  return {
    tripId: formData.get("tripId") ?? "",
    kind: formData.get("kind") ?? "",
    title: formData.get("title") ?? "",
    startsAtLocal: formData.get("startsAtLocal") ?? "",
    endsAtLocal: formData.get("endsAtLocal") ?? "",
    timezone: formData.get("timezone") ?? "",
    locationName: formData.get("locationName") ?? "",
    locationAddress: formData.get("locationAddress") ?? "",
    from: formData.get("from") ?? "",
    to: formData.get("to") ?? "",
    transportMode: formData.get("transportMode") ?? "",
    carrier: formData.get("carrier") ?? "",
    bookingReference: formData.get("bookingReference") ?? "",
    notes: formData.get("notes") ?? "",
  };
}

function eventInsertOf(d: EventFields, eventId: string, userId: string) {
  const metadata: Record<string, string> = {};
  if (d.kind === "TRANSPORT") {
    if (d.transportMode) metadata.transport_mode = d.transportMode;
    if (d.from) metadata.from = d.from;
    if (d.to) metadata.to = d.to;
  }
  if (d.carrier) metadata.carrier = d.carrier;
  if (d.bookingReference) metadata.booking_reference = d.bookingReference;
  return {
    id: eventId,
    trip_id: d.tripId,
    type: d.kind,
    title: d.title,
    starts_at: localToUtcIso(d.startsAtLocal, d.timezone),
    ends_at: d.endsAtLocal ? localToUtcIso(d.endsAtLocal, d.timezone) : null,
    timezone: d.timezone,
    location_name: d.locationName || (d.kind === "TRANSPORT" ? d.from || null : null),
    location_address: d.locationAddress || null,
    notes: d.notes || null,
    metadata,
    created_by: userId,
  };
}

const importedEventSchema = (t: Translate) =>
  z
    .object({
      ...eventFieldsSchema(t),
      // Document attaché (la confirmation elle-même), déjà uploadé côté client
      documentId: z.string().uuid(),
      fileName: z.string().trim().min(1).max(255),
      mimeType: z.string().refine(isAllowedMimeType, t("events.msg.badFormat")),
      sizeBytes: z.coerce.number().int().positive().max(MAX_FILE_SIZE_BYTES),
      storagePath: z.string().min(1),
    })
    .refine((v) => !v.endsAtLocal || v.endsAtLocal >= v.startsAtLocal, {
      message: t("events.msg.endBeforeStart"),
      path: ["endsAtLocal"],
    });

export type ImportedEventState = ActionState;

/**
 * Crée l'événement validé par l'utilisateur après import (PHIL-O01) et
 * attache la confirmation comme document du voyage.
 */
export async function createImportedEvent(
  _prev: ImportedEventState,
  formData: FormData,
): Promise<ImportedEventState> {
  const t = await getT();
  const parsed = importedEventSchema(t).safeParse({
    ...eventFieldsFrom(formData),
    documentId: formData.get("documentId"),
    fileName: formData.get("fileName"),
    mimeType: formData.get("mimeType"),
    sizeBytes: formData.get("sizeBytes"),
    storagePath: formData.get("storagePath"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? t("events.msg.invalidInput"),
    };
  }
  const d = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  if (!d.storagePath.startsWith(`${user.id}/${d.documentId}`)) {
    return { status: "error", message: t("events.msg.storagePathInvalid") };
  }

  const eventId = crypto.randomUUID();
  const { error: eventError } = await supabase
    .from("trip_events")
    .insert(eventInsertOf(d, eventId, user.id));
  if (eventError) {
    const admin = createAdminClient();
    await admin.storage.from("documents").remove([d.storagePath]);
    return {
      status: "error",
      message: t("events.msg.createDenied"),
    };
  }

  // La confirmation devient un document du voyage, attaché à l'événement.
  const { error: docError } = await supabase.from("documents").insert({
    id: d.documentId,
    owner_id: user.id,
    scope: "TRIP",
    trip_id: d.tripId,
    file_name: d.fileName,
    mime_type: d.mimeType,
    size_bytes: d.sizeBytes,
    storage_path: d.storagePath,
    category: d.kind === "LODGING" ? "lodging" : "ticket",
    metadata: {},
  });
  if (!docError) {
    await supabase.from("event_documents").insert({ event_id: eventId, document_id: d.documentId });
  }

  await geolocateEvent(
    supabase,
    d.tripId,
    eventId,
    d.locationAddress || d.locationName || d.to || undefined,
  );

  redirect(`/trips/${d.tripId}/events/${eventId}`);
}

const finalizeDraftSchema = (t: Translate) =>
  z
    .object({ ...eventFieldsSchema(t), draftId: z.string().uuid() })
    .refine((v) => !v.endsAtLocal || v.endsAtLocal >= v.startsAtLocal, {
      message: t("events.msg.endBeforeStart"),
      path: ["endsAtLocal"],
    });

/**
 * Valide un brouillon reçu par email (PHIL-P02) : crée l'événement, déplace
 * la pièce jointe vers un document du voyage attaché, marque le brouillon DONE.
 */
export async function finalizeDraft(
  _prev: ImportedEventState,
  formData: FormData,
): Promise<ImportedEventState> {
  const t = await getT();
  const parsed = finalizeDraftSchema(t).safeParse({
    ...eventFieldsFrom(formData),
    draftId: formData.get("draftId"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? t("events.msg.invalidInput"),
    };
  }
  const d = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // RLS : visible seulement des OWNER/EDITOR du voyage
  const { data: draft } = await supabase
    .from("import_drafts")
    .select("*")
    .eq("id", d.draftId)
    .eq("trip_id", d.tripId)
    .eq("status", "PENDING")
    .single();
  if (!draft) {
    return { status: "error", message: t("events.msg.draftNotFound") };
  }

  const eventId = crypto.randomUUID();
  const { error: eventError } = await supabase
    .from("trip_events")
    .insert(eventInsertOf(d, eventId, user.id));
  if (eventError) {
    return {
      status: "error",
      message: t("events.msg.createDenied"),
    };
  }

  // Pièce jointe (si présente) : copiée du dossier inbound/ vers mes documents
  if (draft.storage_path && draft.mime_type) {
    const admin = createAdminClient();
    const documentId = crypto.randomUUID();
    const ext = draft.storage_path.slice(draft.storage_path.lastIndexOf(".") + 1);
    const destPath = `${user.id}/${documentId}.${ext}`;
    const { error: copyError } = await admin.storage
      .from("documents")
      .copy(draft.storage_path, destPath);
    if (!copyError) {
      const { error: docError } = await supabase.from("documents").insert({
        id: documentId,
        owner_id: user.id,
        scope: "TRIP",
        trip_id: d.tripId,
        file_name: draft.file_name ?? "confirmation.pdf",
        mime_type: draft.mime_type,
        size_bytes: draft.size_bytes ?? 0,
        storage_path: destPath,
        category: d.kind === "LODGING" ? "lodging" : "ticket",
        metadata: {},
      });
      if (!docError) {
        await supabase
          .from("event_documents")
          .insert({ event_id: eventId, document_id: documentId });
        await admin.storage.from("documents").remove([draft.storage_path]);
      }
    }
  }

  await supabase.from("import_drafts").update({ status: "DONE" }).eq("id", d.draftId);
  await geolocateEvent(
    supabase,
    d.tripId,
    eventId,
    d.locationAddress || d.locationName || d.to || undefined,
  );

  redirect(`/trips/${d.tripId}/events/${eventId}`);
}

/** Écarte un brouillon reçu par email (et purge sa pièce jointe). */
export async function dismissDraft(tripId: string, draftId: string): Promise<void> {
  if (!areUuids(tripId, draftId)) {
    return;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { data: updated } = await supabase
    .from("import_drafts")
    .update({ status: "DISMISSED" })
    .eq("id", draftId)
    .eq("trip_id", tripId)
    .select("storage_path");
  const path = updated?.[0]?.storage_path;
  if (path) {
    const admin = createAdminClient();
    await admin.storage.from("documents").remove([path]);
  }
  redirect(`/trips/${tripId}/events/import`);
}
