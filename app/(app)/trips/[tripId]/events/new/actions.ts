"use server";

import { fromZonedTime } from "date-fns-tz";
import { redirect } from "next/navigation";
import { z } from "zod";
import { TRANSPORT_MODES } from "@/lib/events/transport";
import { createClient } from "@/lib/supabase/server";

const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const transportSchema = z
  .object({
    tripId: z.string().uuid(),
    title: z.string().trim().min(1, "Donne un titre à ce transport.").max(150),
    mode: z.enum(TRANSPORT_MODES),
    from: z.string().trim().min(1, "D'où part-on ?").max(120),
    to: z.string().trim().min(1, "Où arrive-t-on ?").max(120),
    startsAtLocal: z.string().regex(DATETIME_LOCAL, "Date et heure de départ requises."),
    endsAtLocal: z.union([z.literal(""), z.string().regex(DATETIME_LOCAL)]).optional(),
    timezone: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz), {
      message: "Fuseau horaire inconnu.",
    }),
    bookingReference: z.string().trim().max(100).optional(),
    carrier: z.string().trim().max(120).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((v) => !v.endsAtLocal || v.endsAtLocal >= v.startsAtLocal, {
    message: "L'arrivée ne peut pas précéder le départ.",
    path: ["endsAtLocal"],
  });

export type CreateEventState = {
  status: "idle" | "error";
  message?: string;
};

export async function createTransportEvent(
  _prev: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const parsed = transportSchema.safeParse({
    tripId: formData.get("tripId"),
    title: formData.get("title"),
    mode: formData.get("mode"),
    from: formData.get("from"),
    to: formData.get("to"),
    startsAtLocal: formData.get("startsAtLocal"),
    endsAtLocal: formData.get("endsAtLocal") ?? "",
    timezone: formData.get("timezone"),
    bookingReference: formData.get("bookingReference") ?? "",
    carrier: formData.get("carrier") ?? "",
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
  // Heure locale saisie dans le fuseau choisi -> instant UTC stocké.
  const startsAt = fromZonedTime(d.startsAtLocal, d.timezone).toISOString();
  const endsAt = d.endsAtLocal ? fromZonedTime(d.endsAtLocal, d.timezone).toISOString() : null;

  const metadata: Record<string, string> = { transport_mode: d.mode, from: d.from, to: d.to };
  if (d.bookingReference) {
    metadata.booking_reference = d.bookingReference;
  }
  if (d.carrier) {
    metadata.carrier = d.carrier;
  }

  const { error } = await supabase.from("trip_events").insert({
    trip_id: d.tripId,
    type: "TRANSPORT",
    title: d.title,
    starts_at: startsAt,
    ends_at: endsAt,
    timezone: d.timezone,
    location_name: d.from,
    notes: d.notes || null,
    metadata,
    created_by: user.id,
  });

  if (error) {
    return {
      status: "error",
      message: "La création a échoué — il faut être capitaine ou éditeur du voyage.",
    };
  }

  redirect(`/trips/${d.tripId}`);
}
