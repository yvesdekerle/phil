"use server";

import { fromZonedTime } from "date-fns-tz";
import { redirect } from "next/navigation";
import { z } from "zod";
import { LODGING_PLATFORMS } from "@/lib/events/lodging";
import { TRANSPORT_MODES } from "@/lib/events/transport";
import { geolocateEvent } from "@/lib/geo/locate";
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
    externalUrl: z.union([z.literal(""), z.string().url("Lien invalide.")]).optional(),
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

const lodgingSchema = z
  .object({
    tripId: z.string().uuid(),
    name: z.string().trim().min(1, "Quel est le nom de l'hébergement ?").max(150),
    address: z.string().trim().max(300).optional(),
    checkInLocal: z.string().regex(DATETIME_LOCAL, "Date et heure de check-in requises."),
    checkOutLocal: z.string().regex(DATETIME_LOCAL, "Date et heure de check-out requises."),
    timezone: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz), {
      message: "Fuseau horaire inconnu.",
    }),
    platform: z.enum(LODGING_PLATFORMS),
    bookingReference: z.string().trim().max(100).optional(),
    guests: z.union([z.literal(""), z.coerce.number().int().min(1).max(50)]).optional(),
    externalUrl: z.union([z.literal(""), z.string().url("Lien invalide.")]).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((v) => v.checkOutLocal >= v.checkInLocal, {
    message: "Le check-out ne peut pas précéder le check-in.",
    path: ["checkOutLocal"],
  });

const activitySchema = z.object({
  tripId: z.string().uuid(),
  title: z.string().trim().min(1, "Donne un titre à cette activité.").max(150),
  description: z.string().trim().max(2000).optional(),
  locationName: z.string().trim().max(150).optional(),
  startsAtLocal: z.string().regex(DATETIME_LOCAL, "Date et heure de début requises."),
  timezone: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz), {
    message: "Fuseau horaire inconnu.",
  }),
  durationMinutes: z
    .union([
      z.literal(""),
      z.coerce
        .number()
        .int()
        .min(5)
        .max(60 * 24 * 7),
    ])
    .optional(),
  cost: z.union([z.literal(""), z.coerce.number().min(0).max(1000000)]).optional(),
  costCurrency: z.string().trim().max(3).optional(),
  externalUrl: z.union([z.literal(""), z.string().url("Lien invalide.")]).optional(),
  ideaId: z.union([z.literal(""), z.string().uuid()]).optional(),
});

export async function createActivityEvent(
  _prev: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const parsed = activitySchema.safeParse({
    tripId: formData.get("tripId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    locationName: formData.get("locationName") ?? "",
    startsAtLocal: formData.get("startsAtLocal"),
    timezone: formData.get("timezone"),
    durationMinutes: formData.get("durationMinutes") ?? "",
    cost: formData.get("cost") ?? "",
    costCurrency: formData.get("costCurrency") ?? "",
    externalUrl: formData.get("externalUrl") ?? "",
    ideaId: formData.get("ideaId") ?? "",
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
  const startsAt = fromZonedTime(d.startsAtLocal, d.timezone);
  const endsAt = d.durationMinutes
    ? new Date(startsAt.getTime() + d.durationMinutes * 60_000).toISOString()
    : null;

  const metadata: Record<string, string | number> = {};
  if (d.durationMinutes) {
    metadata.duration_minutes = d.durationMinutes;
  }
  if (d.cost !== "" && d.cost !== undefined) {
    metadata.cost = d.cost;
    metadata.cost_currency = d.costCurrency || "EUR";
  }
  if (d.externalUrl) {
    metadata.external_url = d.externalUrl;
  }

  const eventId = crypto.randomUUID();
  const { error } = await supabase.from("trip_events").insert({
    id: eventId,
    trip_id: d.tripId,
    type: "ACTIVITY",
    title: d.title,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt,
    timezone: d.timezone,
    location_name: d.locationName || null,
    notes: d.description || null,
    metadata,
    created_by: user.id,
  });

  if (error) {
    return {
      status: "error",
      message: "La création a échoué — il faut être capitaine ou éditeur du voyage.",
    };
  }

  // Conversion depuis une idée (PHIL-H04) : l'idée passe en SCHEDULED
  // et garde la référence vers l'événement créé.
  if (d.ideaId) {
    await supabase
      .from("trip_ideas")
      .update({ status: "SCHEDULED", scheduled_event_id: eventId })
      .eq("id", d.ideaId)
      .eq("trip_id", d.tripId);
  }

  await geolocateEvent(supabase, d.tripId, eventId, d.locationName);

  redirect(`/trips/${d.tripId}`);
}

export async function createLodgingEvent(
  _prev: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const parsed = lodgingSchema.safeParse({
    tripId: formData.get("tripId"),
    name: formData.get("name"),
    address: formData.get("address") ?? "",
    checkInLocal: formData.get("checkInLocal"),
    checkOutLocal: formData.get("checkOutLocal"),
    timezone: formData.get("timezone"),
    platform: formData.get("platform"),
    bookingReference: formData.get("bookingReference") ?? "",
    guests: formData.get("guests") ?? "",
    externalUrl: formData.get("externalUrl") ?? "",
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
  const metadata: Record<string, string | number> = { platform: d.platform };
  if (d.bookingReference) {
    metadata.booking_reference = d.bookingReference;
  }
  if (d.guests) {
    metadata.guests = d.guests;
  }
  if (d.externalUrl) {
    metadata.external_url = d.externalUrl;
  }

  const eventId = crypto.randomUUID();
  const { error } = await supabase.from("trip_events").insert({
    id: eventId,
    trip_id: d.tripId,
    type: "LODGING",
    title: d.name,
    starts_at: fromZonedTime(d.checkInLocal, d.timezone).toISOString(),
    ends_at: fromZonedTime(d.checkOutLocal, d.timezone).toISOString(),
    timezone: d.timezone,
    location_name: d.name,
    location_address: d.address || null,
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

  await geolocateEvent(supabase, d.tripId, eventId, d.address || d.name);

  redirect(`/trips/${d.tripId}`);
}

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
    externalUrl: formData.get("externalUrl") ?? "",
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
  if (d.externalUrl) {
    metadata.external_url = d.externalUrl;
  }

  const eventId = crypto.randomUUID();
  const { error } = await supabase.from("trip_events").insert({
    id: eventId,
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

  await geolocateEvent(supabase, d.tripId, eventId, d.to || d.from);

  redirect(`/trips/${d.tripId}`);
}
