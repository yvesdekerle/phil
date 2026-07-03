"use server";

import { fromZonedTime } from "date-fns-tz";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const updateEventSchema = z
  .object({
    tripId: z.string().uuid(),
    eventId: z.string().uuid(),
    title: z.string().trim().min(1, "Le titre ne peut pas être vide.").max(150),
    startsAtLocal: z.string().regex(DATETIME_LOCAL, "Date et heure de début requises."),
    endsAtLocal: z.union([z.literal(""), z.string().regex(DATETIME_LOCAL)]).optional(),
    timezone: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz), {
      message: "Fuseau horaire inconnu.",
    }),
    locationName: z.string().trim().max(150).optional(),
    locationAddress: z.string().trim().max(300).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((v) => !v.endsAtLocal || v.endsAtLocal >= v.startsAtLocal, {
    message: "La fin ne peut pas précéder le début.",
    path: ["endsAtLocal"],
  });

export type EventActionState = {
  status: "idle" | "error";
  message?: string;
};

export async function updateEvent(
  _prev: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = updateEventSchema.safeParse({
    tripId: formData.get("tripId"),
    eventId: formData.get("eventId"),
    title: formData.get("title"),
    startsAtLocal: formData.get("startsAtLocal"),
    endsAtLocal: formData.get("endsAtLocal") ?? "",
    timezone: formData.get("timezone"),
    locationName: formData.get("locationName") ?? "",
    locationAddress: formData.get("locationAddress") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const d = parsed.data;
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
      },
      { count: "exact" },
    )
    .eq("id", d.eventId);

  if (error || count === 0) {
    return {
      status: "error",
      message: "La modification a échoué — il faut être capitaine ou éditeur du voyage.",
    };
  }

  console.log(`[audit] event ${d.eventId} modifié par ${user.id}`);
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
    return { status: "error", message: "Document introuvable." };
  }

  if (doc.scope === "VAULT") {
    const { data: existingShare } = await supabase
      .from("document_shares")
      .select("id")
      .eq("document_id", documentId)
      .eq("trip_id", tripId)
      .maybeSingle();

    if (!existingShare) {
      if (doc.owner_id !== user.id) {
        return {
          status: "error",
          message: "Seul le propriétaire peut partager ce document avec le voyage.",
        };
      }
      const { error: shareError } = await supabase.from("document_shares").insert({
        document_id: documentId,
        trip_id: tripId,
        shared_by: user.id,
      });
      if (shareError) {
        return { status: "error", message: "Le partage vers le voyage a échoué." };
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
    return { status: "error", message: "Ce document appartient à un autre voyage." };
  }

  const { error } = await supabase
    .from("event_documents")
    .insert({ event_id: eventId, document_id: documentId });

  if (error && !error.message.includes("duplicate")) {
    return { status: "error", message: "L'attache a échoué." };
  }

  const { revalidatePath } = await import("next/cache");
  revalidatePath(`/trips/${tripId}/events/${eventId}`);
  return { status: "idle" };
}

export async function detachDocument(
  tripId: string,
  eventId: string,
  documentId: string,
): Promise<EventActionState> {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("event_documents")
    .delete({ count: "exact" })
    .eq("event_id", eventId)
    .eq("document_id", documentId);

  if (error || count === 0) {
    return { status: "error", message: "Le détachement a échoué." };
  }

  const { revalidatePath } = await import("next/cache");
  revalidatePath(`/trips/${tripId}/events/${eventId}`);
  return { status: "idle" };
}

export async function deleteEvent(tripId: string, eventId: string): Promise<EventActionState> {
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
      message: "La suppression a échoué — réservée au capitaine ou au créateur de l'événement.",
    };
  }

  console.log(`[audit] event ${eventId} supprimé par ${user.id}`);
  redirect(`/trips/${tripId}`);
}
