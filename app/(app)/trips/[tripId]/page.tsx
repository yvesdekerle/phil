import Link from "next/link";
import { redirect } from "next/navigation";
import { EventTypeIcon } from "@/components/calendar/event-type-icon";
import { TodayHero } from "@/components/calendar/today-hero";
import { SearchForm } from "@/components/search-form";
import { WeatherLine, WeatherStrip } from "@/components/trips/trip-weather";
import { WorldClocks } from "@/components/trips/world-clocks";
import { Button } from "@/components/ui/button";
import { eventDayKey, eventTime, groupEventsByDay } from "@/lib/events/datetime";
import type { TripEvent } from "@/lib/events/types";
import { navigateUrl } from "@/lib/geo/directions";
import { ensureTripCoords } from "@/lib/geo/locate";
import { formatMinutes, getTravelMinutes } from "@/lib/geo/travel-time";
import { fuzzyMatch } from "@/lib/search/fuzzy";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { type DailyForecast, getDailyForecast } from "@/lib/weather/open-meteo";
import { QuickAdd } from "./quick-add";

export default async function TripCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { tripId } = await params;
  const { q } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: eventsData }, { data: me }, { data: trip }, { data: myProfile }] =
    await Promise.all([
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
      supabase.from("profiles").select("timezone").eq("id", user.id).single(),
    ]);

  // PHIL-Q24 : horloges chez-soi / destination
  const homeTimezone = myProfile?.timezone ?? "Europe/Paris";
  const homeLabel = homeTimezone.split("/").pop()?.replace(/_/g, " ") ?? homeTimezone;

  const events = (eventsData ?? []) as TripEvent[];
  const canEdit = me?.role === "OWNER" || me?.role === "EDITOR";
  // PHIL-Q22 : recherche tolérante sur le programme
  const visibleEvents = q?.trim()
    ? events.filter((e) => fuzzyMatch(`${e.title} ${e.location_name ?? ""} ${e.notes ?? ""}`, q))
    : events;
  const days = groupEventsByDay(visibleEvents);
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
      {trip ? (
        <WorldClocks
          homeTimezone={homeTimezone}
          homeLabel={homeLabel}
          tripTimezone={trip.default_timezone}
          tripLabel={trip.destination}
        />
      ) : null}
      {trip ? <WeatherStrip days={weatherDays} destination={trip.destination} /> : null}
      <div className="flex items-center justify-end gap-3">
        <Button asChild variant="outline">
          <Link href={`/trips/${tripId}/timeline`}>Timeline</Link>
        </Button>
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

      {events.length > 0 ? (
        <SearchForm action={`/trips/${tripId}`} q={q} placeholder="Rechercher dans le programme…" />
      ) : null}

      {days.length > 0 ? (
        <p className="-mb-3 text-right text-xs text-encre-douce">
          Heures affichées en heure locale de chaque événement.
        </p>
      ) : null}

      {days.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-6 py-14 text-center">
          <p className="font-display text-xl text-encre italic">
            {q ? "Rien ne correspond à cette recherche" : "Aucun événement pour l'instant"}
          </p>
          <p className="max-w-sm text-sm text-encre-douce">
            {q
              ? "Essaie un autre mot — la recherche tolère les accents et les petites fautes."
              : "Même Phileas prenait des pauses — mais un vol, un hôtel ou une plongée, ça se note."}
          </p>
          {canEdit ? (
            <Button asChild className="mt-1">
              <Link href={`/trips/${tripId}/events/new`}>Ajouter un événement</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {days.map((day) => (
            <section key={day.dayKey}>
              <h2
                className={cn(
                  "mb-2 flex items-center gap-2 text-sm font-medium capitalize",
                  day.dayKey === todayKey ? "text-bordeaux" : "text-encre-douce",
                )}
              >
                <Link
                  href={`/trips/${tripId}/day/${day.dayKey}`}
                  className="underline-offset-4 hover:underline"
                  title="Voir la journée heure par heure"
                >
                  {day.label}
                </Link>
                {day.dayKey === todayKey ? (
                  <span className="rounded-full bg-bordeaux px-2 py-0.5 text-[0.65rem] font-medium text-papier uppercase">
                    Aujourd'hui
                  </span>
                ) : null}
              </h2>
              <ul className="flex flex-col gap-2">
                {day.events.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/trips/${tripId}/events/${event.id}`}
                      className="flex items-center gap-3 rounded-lg border border-laiton-clair bg-papier px-4 py-3 transition-shadow hover:shadow-[0_2px_12px_rgba(31,42,68,0.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laiton"
                    >
                      <span className="w-14 shrink-0 text-sm font-medium text-encre tabular-nums">
                        {eventTime(event.starts_at, event.timezone)}
                      </span>
                      <EventTypeIcon type={event.type} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-encre">
                          {event.title}
                        </span>
                        {event.location_name ? (
                          <span className="block truncate text-xs text-encre-douce">
                            {event.location_name}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
