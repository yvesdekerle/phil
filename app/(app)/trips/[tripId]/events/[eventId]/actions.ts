"use server";

import { fromZonedTime } from "date-fns-tz";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getT } from "@/lib/i18n/server";
import { logger } from "@/lib/observability/logger";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";

const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export type EventActionState = {
  status: "idle" | "error";
  message?: string;
};

export async function updateEvent(
  _prev: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const t = await getT();
  const updateEventSchema = z
    .object({
      tripId: z.string().uuid(),
      eventId: z.string().uuid(),
      title: z.string().trim().min(1, t("events.msg.editTitleRequired")).max(150),
      startsAtLocal: z.string().regex(DATETIME_LOCAL, t("events.msg.startRequired")),
      endsAtLocal: z.union([z.literal(""), z.string().regex(DATETIME_LOCAL)]).optional(),
      timezone: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz), {
        message: t("events.msg.timezoneUnknown"),
      }),
      locationName: z.string().trim().max(150).optional(),
      locationAddress: z.string().trim().max(300).optional(),
      externalUrl: z.union([z.literal(""), z.string().url(t("events.msg.linkInvalid"))]).optional(),
      notes: z.string().trim().max(2000).optional(),
    })
    .refine((v) => !v.endsAtLocal || v.endsAtLocal >= v.startsAtLocal, {
      message: t("events.msg.endBeforeStart"),
      path: ["endsAtLocal"],
    });
  const parsed = updateEventSchema.safeParse({
    tripId: formData.get("tripId"),
    eventId: formData.get("eventId"),
    title: formData.get("title"),
    startsAtLocal: formData.get("startsAtLocal"),
    endsAtLocal: formData.get("endsAtLocal") ?? "",
    timezone: formData.get("timezone"),
    locationName: formData.get("locationName") ?? "",
    locationAddress: formData.get("locationAddress") ?? "",
    externalUrl: formData.get("externalUrl") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? t("events.msg.invalidInput"),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const d = parsed.data;
  // PHIL-O07 : external_url vit dans le JSONB metadata — merge sans écraser le reste
  const { data: current } = await supabase
    .from("trip_events")
    .select("metadata")
    .eq("id", d.eventId)
    .single();
  const metadata = { ...((current?.metadata as Record<string, string | number>) ?? {}) };
  if (d.externalUrl) {
    metadata.external_url = d.externalUrl;
  } else {
    delete metadata.external_url;
  }

  const { error, count } = await supabase
    .from("trip_events")
    .update(
      {
        title: d.title,
        starts_at: fromZonedTime(d.startsAtLocal, d.timezone).toISOString(),
        ends_at: d.endsAtLocal ? fromZonedTime(d.endsAtLocal, d.timezone).toISOString() : null,
        timezone: d.timezone,
        location_name: d.locationName || null,
        location_address: d.locationAddress || null,
        notes: d.notes || null,
        metadata,
      },
      { count: "exact" },
    )
    .eq("id", d.eventId);

  if (error || count === 0) {
    return {
      status: "error",
      message: t("events.msg.editDenied"),
    };
  }

  logger.info("event_updated", { eventId: d.eventId, userId: user.id });
  redirect(`/trips/${d.tripId}/events/${d.eventId}`);
}

/**
 * Attache un document à un événement (PHIL-F10).
 * Si le document vient du coffre (VAULT) et n'est pas encore partagé avec le
 * voyage, le partage est créé automatiquement (uniquement par son propriétaire)
 * et loggé SHARE dans vault_access_log.
 */
export async function attachDocument(
  tripId: string,
  eventId: string,
  documentId: string,
): Promise<EventActionState> {
  const t = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // RLS : si le doc n'est pas visible (ni à moi, ni au voyage), single() échoue.
  const { data: doc } = await supabase
    .from("documents")
    .select("id, scope, owner_id, trip_id")
    .eq("id", documentId)
    .is("deleted_at", null)
    .single();

  if (!doc) {
    return { status: "error", message: t("events.msg.docNotFound") };
  }

  if (doc.scope === "VAULT") {
    // On cherche un partage équipage entier (E09 : un partage ciblé ne
    // suffit pas pour attacher un doc visible de tous à un événement)
    const { data: existingShare } = await supabase
      .from("document_shares")
      .select("id")
      .eq("document_id", documentId)
      .eq("trip_id", tripId)
      .is("shared_with", null)
      .maybeSingle();

    if (!existingShare) {
      if (doc.owner_id !== user.id) {
        return {
          status: "error",
          message: t("events.msg.shareOwnerOnly"),
        };
      }
      const { error: shareError } = await supabase.from("document_shares").insert({
        document_id: documentId,
        trip_id: tripId,
        shared_by: user.id,
      });
      if (shareError) {
        return { status: "error", message: t("events.msg.shareFailed") };
      }
      const { logVaultAccess } = await import("@/lib/vault/audit");
      await logVaultAccess({
        action: "SHARE",
        documentId,
        accessedBy: user.id,
        documentOwnerId: doc.owner_id,
      });
    }
  } else if (doc.trip_id !== tripId) {
    return { status: "error", message: t("events.msg.docOtherTrip") };
  }

  const { error } = await supabase
    .from("event_documents")
    .insert({ event_id: eventId, document_id: documentId });

  if (error && !error.message.includes("duplicate")) {
    return { status: "error", message: t("events.msg.attachFailed") };
  }

  const { revalidatePath } = await import("next/cache");
  revalidatePath(`/trips/${tripId}/events/${eventId}`);
  return { status: "idle" };
}

/**
 * Inscrit ou retire un participant d'un événement (PHIL-F11).
 * La RLS porte les droits : soi-même si membre du voyage, n'importe quel
 * membre si OWNER/EDITOR.
 */
export async function toggleEventParticipant(
  tripId: string,
  eventId: string,
  userId: string,
  present: boolean,
): Promise<EventActionState> {
  const t = await getT();
  if (!areUuids(tripId, eventId, userId)) {
    return { status: "error", message: t("events.msg.invalidIds") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { revalidatePath } = await import("next/cache");

  if (present) {
    const { error } = await supabase
      .from("event_participants")
      .upsert({ event_id: eventId, user_id: userId }, { onConflict: "event_id,user_id" });
    if (error) {
      return {
        status: "error",
        message: t("events.msg.enrollDenied"),
      };
    }
  } else {
    const { error, count } = await supabase
      .from("event_participants")
      .delete({ count: "exact" })
      .eq("event_id", eventId)
      .eq("user_id", userId);
    if (error || count === 0) {
      return { status: "error", message: t("events.msg.removeDenied") };
    }
  }

  revalidatePath(`/trips/${tripId}/events/${eventId}`);
  return { status: "idle" };
}

export async function detachDocument(
  tripId: string,
  eventId: string,
  documentId: string,
): Promise<EventActionState> {
  const t = await getT();
  if (!areUuids(tripId, eventId, documentId)) {
    return { status: "error", message: t("events.msg.invalidIds") };
  }
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("event_documents")
    .delete({ count: "exact" })
    .eq("event_id", eventId)
    .eq("document_id", documentId);

  if (error || count === 0) {
    return { status: "error", message: t("events.msg.detachFailed") };
  }

  const { revalidatePath } = await import("next/cache");
  revalidatePath(`/trips/${tripId}/events/${eventId}`);
  return { status: "idle" };
}

export async function deleteEvent(tripId: string, eventId: string): Promise<EventActionState> {
  const t = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Les liaisons event_documents partent en cascade, les documents restent.
  const { error, count } = await supabase
    .from("trip_events")
    .delete({ count: "exact" })
    .eq("id", eventId);

  if (error || count === 0) {
    return {
      status: "error",
      message: t("events.msg.deleteDenied"),
    };
  }

  logger.info("event_deleted", { eventId, userId: user.id });
  redirect(`/trips/${tripId}`);
}
