import { redirect } from "next/navigation";
import { ensureTripCoords } from "@/lib/geo/locate";
import { createClient } from "@/lib/supabase/server";
import { suggestPackingItems } from "@/lib/trips/packing-suggestions";
import { getDailyForecast } from "@/lib/weather/open-meteo";
import { ChecklistClient } from "./checklist-client";

/** Checklist partagée du voyage (PHIL-N11). */
export default async function ChecklistPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: items }, { data: members }, { data: me }] = await Promise.all([
    supabase
      .from("checklist_items")
      .select("id, section, title, done, assigned_to, created_by, event_id, trip_events(title)")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true }),
    supabase
      .from("trip_participants")
      .select("user_id, profiles!trip_participants_user_id_fkey(display_name)")
      .eq("trip_id", tripId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("trip_participants")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single(),
  ]);

  // PHIL-P06 : suggestions contextuelles (météo prévue + activités + durée)
  const [{ data: trip }, { data: events }] = await Promise.all([
    supabase
      .from("trips")
      .select(
        "id, destination, destination_lat, destination_lng, default_timezone, start_date, end_date",
      )
      .eq("id", tripId)
      .single(),
    supabase.from("trip_events").select("title").eq("trip_id", tripId),
  ]);
  let suggestions: { title: string; reason: string }[] = [];
  if (trip) {
    const coords = await ensureTripCoords(supabase, trip);
    const forecast = coords
      ? await getDailyForecast(coords.lat, coords.lng, trip.default_timezone)
      : [];
    const nights = Math.max(
      0,
      Math.round(
        (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86_400_000,
      ),
    );
    suggestions = suggestPackingItems({
      forecast: forecast.filter((d) => d.date >= trip.start_date && d.date <= trip.end_date),
      eventTitles: (events ?? []).map((e) => e.title),
      nights,
      existingTitles: (items ?? []).map((i) => i.title),
    });
  }

  return (
    <ChecklistClient
      tripId={tripId}
      items={(items ?? []).map((i) => ({
        ...i,
        eventTitle: i.trip_events?.title ?? null,
      }))}
      members={(members ?? []).map((m) => ({
        userId: m.user_id,
        name: m.profiles?.display_name ?? "Voyageur",
      }))}
      myId={user.id}
      isOwner={me?.role === "OWNER"}
      suggestions={suggestions}
    />
  );
}
