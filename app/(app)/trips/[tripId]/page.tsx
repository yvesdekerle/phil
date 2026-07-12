import { CalendarDays, Plus } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TripViewToggle } from "@/components/calendar/trip-view-toggle";
import { TripReadiness } from "@/components/trips/trip-readiness";
import { WeatherStrip } from "@/components/trips/trip-weather";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Fab } from "@/components/ui/fab";
import { eventDayKey, formatInTimezone } from "@/lib/events/datetime";
import type { TripEvent } from "@/lib/events/types";
import { navigateUrl } from "@/lib/geo/directions";
import { ensureTripCoords } from "@/lib/geo/locate";
import { formatMinutes, getTravelMinutes } from "@/lib/geo/travel-time";
import { getT } from "@/lib/i18n/server";
import { getPendingByTrip } from "@/lib/notifications/pending-server";
import { createClient } from "@/lib/supabase/server";
import { type DailyForecast, getDailyForecast } from "@/lib/weather/open-meteo";
import { ProgrammeClient } from "./programme-client";
import { QuickAdd } from "./quick-add";

export default async function TripCalendarPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const t = await getT();
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
      .select("*, event_documents(count)")
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

  const events = (eventsData ?? []) as (TripEvent & { event_documents: { count: number }[] })[];
  const canEdit = me?.role === "OWNER" || me?.role === "EDITOR";
  // "Aujourd'hui" dans le fuseau du voyage
  const todayKey = trip ? eventDayKey(new Date().toISOString(), trip.default_timezone) : null;

  // PHIL-N10 : événement en cours / prochain départ pendant le voyage
  const nowIso = new Date().toISOString();
  const tripOngoing =
    trip && trip.start_date <= nowIso.slice(0, 10) && nowIso.slice(0, 10) <= trip.end_date;
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
  // « SAM 08 · 29° » (déclinaison L2a) — jour courant dans le fuseau du voyage
  const headerMeta = trip
    ? `${formatInTimezone(nowIso, trip.default_timezone, "EEE dd").replace(".", "").toUpperCase()}${
        todayWeather ? ` · ${todayWeather.tMax}°` : ""
      }`
    : null;

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
      travelToNext = `${formatMinutes(minutes)} ${t("calendar.byRoad")}`;
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

  // PHIL-U02 : la journée libre de demain propose d'aller voter les idées
  const pendingMap = await getPendingByTrip(supabase, user.id, [tripId]);
  const hasPendingIdeas = (pendingMap.get(tripId)?.ideas ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3 border-b border-line">
        <TripViewToggle tripId={tripId} active="calendar" />
        {headerMeta ? (
          <span className="pb-2 font-mono text-caption font-semibold text-lagoon-ink uppercase tabular-nums">
            {headerMeta}
          </span>
        ) : null}
      </div>

      {/* PHIL-U01 : préparatifs, tant que le voyage n'est pas passé */}
      {trip && trip.end_date >= nowIso.slice(0, 10) ? <TripReadiness tripId={tripId} /> : null}
      {trip && !tripOngoing ? (
        <WeatherStrip days={weatherDays} destination={trip.destination} />
      ) : null}

      {trip ? (
        events.length === 0 ? (
          <EmptyState
            icon={<CalendarDays />}
            title={t("calendar.emptyTitle")}
            description={t("calendar.emptyBody")}
            action={
              canEdit ? (
                <Button asChild>
                  <Link href={`/trips/${tripId}/events/new`}>{t("calendar.addEvent")}</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ProgrammeClient
            tripId={tripId}
            events={events}
            todayKey={todayKey}
            tripStart={trip.start_date}
            tripEnd={trip.end_date}
            canEdit={canEdit}
            currentEventId={currentEvent?.id ?? null}
            nextEventId={nextEvent?.id ?? null}
            travelToNext={travelToNext}
            navigateToNext={navigateToNext}
            hasPendingIdeas={hasPendingIdeas}
          >
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
          </ProgrammeClient>
        )
      ) : null}

      {canEdit ? (
        <Fab
          asChild
          className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 lg:right-8 lg:bottom-6 print:hidden"
        >
          <Link href={`/trips/${tripId}/events/new`} aria-label={t("calendar.addEvent")}>
            <Plus className="size-6" aria-hidden="true" />
          </Link>
        </Fab>
      ) : null}
    </div>
  );
}
