import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TodayHero } from "@/components/calendar/today-hero";
import { TripViewToggle } from "@/components/calendar/trip-view-toggle";
import { WeatherLine, WeatherStrip } from "@/components/trips/trip-weather";
import { Button } from "@/components/ui/button";
import { eventDayKey, eventTime } from "@/lib/events/datetime";
import type { TripEvent } from "@/lib/events/types";
import { navigateUrl } from "@/lib/geo/directions";
import { ensureTripCoords } from "@/lib/geo/locate";
import { formatMinutes, getTravelMinutes } from "@/lib/geo/travel-time";
import { createClient } from "@/lib/supabase/server";
import { type DailyForecast, getDailyForecast } from "@/lib/weather/open-meteo";
import { CalendarDays } from "./calendar-days";
import { QuickAdd } from "./quick-add";

export default async function TripCalendarPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  // PHIL-Q36 : vue préférée mémorisée — on atterrit direct sur la Timeline si choisie
  const view = (await cookies()).get("phil_trip_view")?.value;
  if (view === "timeline") {
    redirect(`/trips/${tripId}/timeline`);
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: eventsData }, { data: me }, { data: trip }] = await Promise.all([
    supabase
      .from("trip_events")
      .select("*")
      .eq("trip_id", tripId)
      .order("starts_at", { ascending: true }),
    supabase
      .from("trip_participants")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("trips")
      .select(
        "id, destination, destination_lat, destination_lng, default_timezone, start_date, end_date",
      )
      .eq("id", tripId)
      .single(),
  ]);

  const events = (eventsData ?? []) as TripEvent[];
  const canEdit = me?.role === "OWNER" || me?.role === "EDITOR";
  // "Aujourd'hui" dans le fuseau du voyage
  const todayKey = trip ? eventDayKey(new Date().toISOString(), trip.default_timezone) : null;

  // PHIL-N10 : vue « Aujourd'hui » pendant le voyage
  const nowIso = new Date().toISOString();
  const tripOngoing =
    trip && trip.start_date <= nowIso.slice(0, 10) && nowIso.slice(0, 10) <= trip.end_date;
  const heroOf = (e: TripEvent) => ({
    id: e.id,
    title: e.title,
    type: e.type,
    startsAt: e.starts_at,
    time: eventTime(e.starts_at, e.timezone),
    location: e.location_address ?? e.location_name,
  });
  const currentEvent = tripOngoing
    ? (events.find(
        (e) => e.starts_at <= nowIso && e.ends_at !== null && (e.ends_at as string) >= nowIso,
      ) ?? null)
    : null;
  const nextEvent = tripOngoing ? (events.find((e) => e.starts_at > nowIso) ?? null) : null;

  // PHIL-O02 : météo à destination — les jours du voyage couverts par la prévision
  let weatherDays: DailyForecast[] = [];
  if (trip && todayKey) {
    const coords = await ensureTripCoords(supabase, trip);
    if (coords) {
      const forecast = await getDailyForecast(coords.lat, coords.lng, trip.default_timezone);
      weatherDays = forecast
        .filter((d) => d.date >= trip.start_date && d.date <= trip.end_date && d.date >= todayKey)
        .slice(0, 7);
    }
  }
  const todayWeather = weatherDays.find((d) => d.date === todayKey) ?? null;

  // PHIL-P05 : temps de route entre l'événement en cours et le prochain départ
  let travelToNext: string | null = null;
  if (
    currentEvent &&
    nextEvent &&
    currentEvent.location_lat !== null &&
    currentEvent.location_lng !== null &&
    nextEvent.location_lat !== null &&
    nextEvent.location_lng !== null
  ) {
    const minutes = await getTravelMinutes(
      { lat: currentEvent.location_lat, lng: currentEvent.location_lng },
      { lat: nextEvent.location_lat, lng: nextEvent.location_lng },
    );
    if (minutes !== null && minutes >= 3) {
      travelToNext = `${formatMinutes(minutes)} de route`;
    }
  }
  // PHIL-Q13 : lancer la navigation vers le prochain RDV (départ = position actuelle)
  const navigateToNext = nextEvent
    ? nextEvent.location_lat !== null && nextEvent.location_lng !== null
      ? navigateUrl({ lat: nextEvent.location_lat, lng: nextEvent.location_lng })
      : nextEvent.location_address || nextEvent.location_name
        ? navigateUrl((nextEvent.location_address ?? nextEvent.location_name) as string)
        : null
    : null;

  return (
    <div className="flex flex-col gap-6">
      {tripOngoing && todayKey ? (
        <TodayHero
          tripId={tripId}
          current={currentEvent ? heroOf(currentEvent) : null}
          next={nextEvent ? heroOf(nextEvent) : null}
          dayKey={todayKey}
          weather={todayWeather ? <WeatherLine day={todayWeather} /> : undefined}
          travelToNext={travelToNext}
          navigateToNext={navigateToNext}
        />
      ) : null}
      {trip ? <WeatherStrip days={weatherDays} destination={trip.destination} /> : null}
      <div className="flex items-center justify-between gap-3">
        <TripViewToggle tripId={tripId} active="calendar" />
        {canEdit ? (
          <Button asChild>
            <Link href={`/trips/${tripId}/events/new`}>Ajouter un événement</Link>
          </Button>
        ) : null}
      </div>

      {canEdit && trip ? (
        <QuickAdd
          tripId={tripId}
          defaultDate={
            tripOngoing && todayKey
              ? todayKey
              : trip.start_date >= nowIso.slice(0, 10)
                ? trip.start_date
                : trip.end_date
          }
        />
      ) : null}

      <CalendarDays tripId={tripId} events={events} todayKey={todayKey} canEdit={canEdit} />
    </div>
  );
}
