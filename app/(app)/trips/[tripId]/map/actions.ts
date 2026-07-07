"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { geocode } from "@/lib/geo/geocode";
import { getT } from "@/lib/i18n/server";
import { areUuids } from "@/lib/validation";
import { PLACE_CATEGORIES } from "./place-constants";

const placeSchema = z.object({
  tripId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  category: z.enum(PLACE_CATEGORIES),
  address: z.string().trim().min(1).max(300),
  note: z.string().trim().max(300).optional(),
});

export type PlaceState = { status: "idle" | "error"; message?: string };

/** PHIL-S02 : épingle un commerce repéré (adresse géocodée) sur la carte. */
export async function addTripPlace(_prev: PlaceState, formData: FormData): Promise<PlaceState> {
  const parsed = placeSchema.safeParse({
    tripId: formData.get("tripId"),
    name: formData.get("name"),
    category: formData.get("category"),
    address: formData.get("address"),
    note: formData.get("note") ?? "",
  });
  const t = await getT();
  if (!parsed.success) {
    return { status: "error", message: t("places.invalidInput") };
  }
  const coords = await geocode(parsed.data.address);
  if (!coords) {
    return { status: "error", message: t("places.notFound") };
  }
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("trip_places").insert({
    trip_id: parsed.data.tripId,
    name: parsed.data.name,
    category: parsed.data.category,
    lat: coords.lat,
    lng: coords.lng,
    note: parsed.data.note || null,
    created_by: user.id,
  });
  if (error) {
    return { status: "error", message: t("places.addFailed") };
  }
  revalidatePath(`/trips/${parsed.data.tripId}/map`);
  return { status: "idle" };
}

export async function deleteTripPlace(tripId: string, placeId: string): Promise<void> {
  if (!areUuids(tripId, placeId)) {
    return;
  }
  const { supabase } = await requireUser();
  // RLS : suppression réservée au créateur ou à l'OWNER.
  await supabase.from("trip_places").delete().eq("id", placeId).eq("trip_id", tripId);
  revalidatePath(`/trips/${tripId}/map`);
}
