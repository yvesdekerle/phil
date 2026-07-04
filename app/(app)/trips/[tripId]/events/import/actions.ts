"use server";

import { fromZonedTime } from "date-fns-tz";
import { redirect } from "next/navigation";
import { z } from "zod";
import { TRANSPORT_MODES } from "@/lib/events/transport";
import { geolocateEvent } from "@/lib/geo/locate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAllowedMimeType, MAX_FILE_SIZE_BYTES } from "@/lib/vault/upload";

const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const importedEventSchema = z
  .object({
    tripId: z.string().uuid(),
    kind: z.enum(["TRANSPORT", "LODGING", "ACTIVITY"]),
    title: z.string().trim().min(1, "Donne un titre à cet événement.").max(150),
    startsAtLocal: z.string().regex(DATETIME_LOCAL, "Date et heure de début requises."),
    endsAtLocal: z.union([z.literal(""), z.string().regex(DATETIME_LOCAL)]).optional(),
    timezone: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz), {
      message: "Fuseau horaire inconnu.",
    }),
    locationName: z.string().trim().max(150).optional(),
    locationAddress: z.string().trim().max(300).optional(),
    from: z.string().trim().max(120).optional(),
    to: z.string().trim().max(120).optional(),
    transportMode: z.union([z.literal(""), z.enum(TRANSPORT_MODES)]).optional(),
    carrier: z.string().trim().max(120).optional(),
    bookingReference: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(2000).optional(),
    // Document attaché (la confirmation elle-même), déjà uploadé côté client
    documentId: z.string().uuid(),
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.string().refine(isAllowedMimeType, "Format non accepté."),
    sizeBytes: z.coerce.number().int().positive().max(MAX_FILE_SIZE_BYTES),
    storagePath: z.string().min(1),
  })
  .refine((v) => !v.endsAtLocal || v.endsAtLocal >= v.startsAtLocal, {
    message: "La fin ne peut pas précéder le début.",
    path: ["endsAtLocal"],
  });

export type ImportedEventState = { status: "idle" | "error"; message?: string };

/**
 * Crée l'événement validé par l'utilisateur après import (PHIL-O01) et
 * attache la confirmation comme document du voyage.
 */
export async function createImportedEvent(
  _prev: ImportedEventState,
  formData: FormData,
): Promise<ImportedEventState> {
  const parsed = importedEventSchema.safeParse({
    tripId: formData.get("tripId"),
    kind: formData.get("kind"),
    title: formData.get("title"),
    startsAtLocal: formData.get("startsAtLocal"),
    endsAtLocal: formData.get("endsAtLocal") ?? "",
    timezone: formData.get("timezone"),
    locationName: formData.get("locationName") ?? "",
    locationAddress: formData.get("locationAddress") ?? "",
    from: formData.get("from") ?? "",
    to: formData.get("to") ?? "",
    transportMode: formData.get("transportMode") ?? "",
    carrier: formData.get("carrier") ?? "",
    bookingReference: formData.get("bookingReference") ?? "",
    notes: formData.get("notes") ?? "",
    documentId: formData.get("documentId"),
    fileName: formData.get("fileName"),
    mimeType: formData.get("mimeType"),
    sizeBytes: formData.get("sizeBytes"),
    storagePath: formData.get("storagePath"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Saisie invalide." };
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
    return { status: "error", message: "Chemin de stockage invalide." };
  }

  const metadata: Record<string, string> = {};
  if (d.kind === "TRANSPORT") {
    if (d.transportMode) metadata.transport_mode = d.transportMode;
    if (d.from) metadata.from = d.from;
    if (d.to) metadata.to = d.to;
  }
  if (d.carrier) metadata.carrier = d.carrier;
  if (d.bookingReference) metadata.booking_reference = d.bookingReference;

  const eventId = crypto.randomUUID();
  const { error: eventError } = await supabase.from("trip_events").insert({
    id: eventId,
    trip_id: d.tripId,
    type: d.kind,
    title: d.title,
    starts_at: fromZonedTime(d.startsAtLocal, d.timezone).toISOString(),
    ends_at: d.endsAtLocal ? fromZonedTime(d.endsAtLocal, d.timezone).toISOString() : null,
    timezone: d.timezone,
    location_name: d.locationName || (d.kind === "TRANSPORT" ? d.from || null : null),
    location_address: d.locationAddress || null,
    notes: d.notes || null,
    metadata,
    created_by: user.id,
  });
  if (eventError) {
    const admin = createAdminClient();
    await admin.storage.from("documents").remove([d.storagePath]);
    return {
      status: "error",
      message: "La création a échoué — il faut être capitaine ou éditeur du voyage.",
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
