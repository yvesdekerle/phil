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
