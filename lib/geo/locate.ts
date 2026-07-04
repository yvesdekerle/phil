import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { geocode } from "./geocode";

/**
 * Géolocalisation best-effort (PHIL-N01) : après création/édition, tente de
 * positionner l'événement ou l'idée à partir de son lieu, contextualisé par
 * la destination du voyage ("Flic-en-Flac, Île Maurice"). N'échoue jamais.
 */
async function resolve(
  supabase: SupabaseClient<Database>,
  tripId: string,
  place: string | null | undefined,
): Promise<{ lat: number; lng: number } | null> {
  if (!place?.trim()) {
    return null;
  }
  const { data: trip } = await supabase
    .from("trips")
    .select("destination")
    .eq("id", tripId)
    .single();
  const withContext = trip ? await geocode(`${place}, ${trip.destination}`) : null;
  return withContext ?? (await geocode(place));
}

export async function geolocateEvent(
  supabase: SupabaseClient<Database>,
  tripId: string,
  eventId: string,
  place: string | null | undefined,
): Promise<void> {
  const coords = await resolve(supabase, tripId, place);
  if (coords) {
    await supabase
      .from("trip_events")
      .update({ location_lat: coords.lat, location_lng: coords.lng })
      .eq("id", eventId);
  }
}

/**
 * Coordonnées de la destination du voyage (PHIL-O02) : renvoie les colonnes
 * si présentes, sinon géocode la destination et tente de les stocker
 * (best-effort — l'update échoue silencieusement pour un VIEWER, la météo
 * s'affiche quand même).
 */
export async function ensureTripCoords(
  supabase: SupabaseClient<Database>,
  trip: {
    id: string;
    destination: string;
    destination_lat: number | null;
    destination_lng: number | null;
  },
): Promise<{ lat: number; lng: number } | null> {
  if (trip.destination_lat !== null && trip.destination_lng !== null) {
    return { lat: trip.destination_lat, lng: trip.destination_lng };
  }
  const coords = await geocode(trip.destination);
  if (coords) {
    await supabase
      .from("trips")
      .update({ destination_lat: coords.lat, destination_lng: coords.lng })
      .eq("id", trip.id);
  }
  return coords;
}

export async function geolocateIdea(
  supabase: SupabaseClient<Database>,
  tripId: string,
  ideaId: string,
  place: string | null | undefined,
): Promise<void> {
  const coords = await resolve(supabase, tripId, place);
  if (coords) {
    await supabase
      .from("trip_ideas")
      .update({ location_lat: coords.lat, location_lng: coords.lng })
      .eq("id", ideaId);
  }
}
