"use server";

import { fromZonedTime } from "date-fns-tz";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { geolocateEvent } from "@/lib/geo/locate";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const candidateSchema = z
  .object({
    tripId: z.string().uuid(),
    title: z.string().trim().min(1, "Donne un nom à cette option.").max(150),
    url: z.union([z.literal(""), z.string().url("Lien invalide.")]).optional(),
    price: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(1000).optional(),
    checkIn: z.string().regex(DATE, "Date d'arrivée requise."),
    checkOut: z.string().regex(DATE, "Date de départ requise."),
  })
  .refine((v) => v.checkOut >= v.checkIn, {
    message: "Le départ ne peut pas précéder l'arrivée.",
    path: ["checkOut"],
  });

export type CandidateState = { status: "idle" | "error"; message?: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return { supabase, user };
}

/** Propose une option d'hébergement (PHIL-L01). */
export async function addCandidate(
  _prev: CandidateState,
  formData: FormData,
): Promise<CandidateState> {
  const parsed = candidateSchema.safeParse({
    tripId: formData.get("tripId"),
    title: formData.get("title"),
    url: formData.get("url") ?? "",
    price: formData.get("price") ?? "",
    notes: formData.get("notes") ?? "",
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }
  const { supabase, user } = await requireUser();
  const d = parsed.data;
  const { error } = await supabase.from("lodging_candidates").insert({
    trip_id: d.tripId,
    title: d.title,
    url: d.url || null,
    price: d.price || null,
    notes: d.notes || null,
    check_in: d.checkIn,
    check_out: d.checkOut,
    created_by: user.id,
  });
  if (error) {
    return { status: "error", message: "Ajout impossible." };
  }
  revalidatePath(`/trips/${d.tripId}/lodging`);
  return { status: "idle" };
}

/** Rejette (ou ré-ouvre) une option. OWNER/EDITOR — porté par la RLS update. */
export async function setCandidateStatus(
  tripId: string,
  candidateId: string,
  status: "OPEN" | "REJECTED",
): Promise<void> {
  if (!areUuids(tripId, candidateId) || !["OPEN", "REJECTED"].includes(status)) {
    return;
  }
  const { supabase } = await requireUser();
  await supabase
    .from("lodging_candidates")
    .update({ status })
    .eq("id", candidateId)
    .eq("trip_id", tripId);
  revalidatePath(`/trips/${tripId}/lodging`);
}

export async function deleteCandidate(tripId: string, candidateId: string): Promise<void> {
  if (!areUuids(tripId, candidateId)) {
    return;
  }
  const { supabase } = await requireUser();
  await supabase.from("lodging_candidates").delete().eq("id", candidateId).eq("trip_id", tripId);
  revalidatePath(`/trips/${tripId}/lodging`);
}

/**
 * Convertit le candidat retenu en événement LODGING (check-in 15h,
 * check-out 11h, fuseau du voyage) — le mécanisme miroir de la conversion
 * d'idée (H04). Convertir plusieurs candidats d'un même créneau reste permis.
 */
export async function chooseCandidate(tripId: string, candidateId: string): Promise<void> {
  if (!areUuids(tripId, candidateId)) {
    return;
  }
  const { supabase, user } = await requireUser();

  const [{ data: candidate }, { data: trip }] = await Promise.all([
    supabase
      .from("lodging_candidates")
      .select("*")
      .eq("id", candidateId)
      .eq("trip_id", tripId)
      .single(),
    supabase.from("trips").select("default_timezone").eq("id", tripId).single(),
  ]);
  if (!candidate || !trip || candidate.status === "CHOSEN") {
    return;
  }

  const tz = trip.default_timezone;
  const metadata: Record<string, string> = { platform: "other" };
  if (candidate.url) {
    metadata.external_url = candidate.url;
  }

  const eventId = crypto.randomUUID();
  const { error } = await supabase.from("trip_events").insert({
    id: eventId,
    trip_id: tripId,
    type: "LODGING",
    title: candidate.title,
    starts_at: fromZonedTime(`${candidate.check_in}T15:00`, tz).toISOString(),
    ends_at: fromZonedTime(`${candidate.check_out}T11:00`, tz).toISOString(),
    timezone: tz,
    location_name: candidate.title,
    notes: candidate.notes,
    metadata,
    created_by: user.id,
  });
  if (error) {
    return; // RLS : OWNER/EDITOR requis pour créer un événement
  }

  await supabase
    .from("lodging_candidates")
    .update({ status: "CHOSEN", chosen_event_id: eventId })
    .eq("id", candidateId)
    .eq("trip_id", tripId);

  await geolocateEvent(supabase, tripId, eventId, candidate.title);

  revalidatePath(`/trips/${tripId}/lodging`);
  revalidatePath(`/trips/${tripId}`);
}
