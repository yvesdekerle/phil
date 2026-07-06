import { formatInTimeZone } from "date-fns-tz";
import { Navigation } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EventTypeIcon } from "@/components/calendar/event-type-icon";
import { WeatherLine } from "@/components/trips/trip-weather";
import { eventDayKey, eventTime, formatInTimezone } from "@/lib/events/datetime";
import type { TripEvent } from "@/lib/events/types";
import { directionsUrl } from "@/lib/geo/directions";
import { ensureTripCoords } from "@/lib/geo/locate";
import { formatMinutes, getTravelMinutes } from "@/lib/geo/travel-time";
import { suggestVisitOrder } from "@/lib/geo/visit-order";
import { getDateFnsLocale, getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { type DailyForecast, getDailyForecast } from "@/lib/weather/open-meteo";
import { DayJournal, type JournalEntry } from "./day-journal";

const HOUR_START = 6;
const HOUR_END = 24;
const HOUR_HEIGHT = 56; // px par heure

/** Position verticale d'un événement dans la grille (heure locale de l'événement). */
function eventOffsets(event: TripEvent): { top: number; height: number } {
  const startHour =
    Number(formatInTimezone(event.starts_at, event.timezone, "H")) +
    Number(formatInTimezone(event.starts_at, event.timezone, "m")) / 60;
  let endHour = startHour + 1; // défaut : 1 h
  if (event.ends_at) {
    // Si l'événement finit un autre jour, on le coupe à minuit.
    const sameDay =
      eventDayKey(event.ends_at, event.timezone) === eventDayKey(event.starts_at, event.timezone);
    endHour = sameDay
      ? Number(formatInTimezone(event.ends_at, event.timezone, "H")) +
        Number(formatInTimezone(event.ends_at, event.timezone, "m")) / 60
      : HOUR_END;
  }
  const clampedStart = Math.max(startHour, HOUR_START);
  const clampedEnd = Math.min(Math.max(endHour, clampedStart + 0.75), HOUR_END);
  return {
    top: (clampedStart - HOUR_START) * HOUR_HEIGHT,
    height: (clampedEnd - clampedStart) * HOUR_HEIGHT,
  };
}

/** Vue jour (PHIL-F02) : grille horaire d'une journée du voyage. */
export default async function DayViewPage({
  params,
}: {
  params: Promise<{ tripId: string; date: string }>;
}) {
  const { tripId, date } = await params;
  const t = await getT();
  const dfLocale = await getDateFnsLocale();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: events }, { data: trip }, { data: journalRows }] = await Promise.all([
    supabase
      .from("trip_events")
      .select("*")
      .eq("trip_id", tripId)
      .order("starts_at", { ascending: true }),
    supabase
      .from("trips")
      .select("id, destination, destination_lat, destination_lng, default_timezone")
      .eq("id", tripId)
      .single(),
    supabase
      .from("journal_entries")
      .select("author_id, body, profiles!journal_entries_author_id_fkey(display_name)")
      .eq("trip_id", tripId)
      .eq("day", date)
      .order("updated_at", { ascending: true }),
  ]);

  const dayEvents = (events ?? []).filter(
    (e) => eventDayKey(e.starts_at, e.timezone) === date,
  ) as TripEvent[];

  // PHIL-O02 : météo du jour si la date est couverte par la prévision
  let dayWeather: DailyForecast | null = null;
  if (trip) {
    const coords = await ensureTripCoords(supabase, trip);
    if (coords) {
      const forecast = await getDailyForecast(coords.lat, coords.lng, trip.default_timezone);
      dayWeather = forecast.find((d) => d.date === date) ?? null;
    }
  }

  // PHIL-P05 : temps de trajet entre événements consécutifs géolocalisés
  const legs = await Promise.all(
    dayEvents.slice(0, -1).map(async (e, i) => {
      const next = dayEvents[i + 1];
      if (
        e.location_lat === null ||
        e.location_lng === null ||
        next.location_lat === null ||
        next.location_lng === null
      ) {
        return null;
      }
      const origin = { lat: e.location_lat, lng: e.location_lng };
      const destination = { lat: next.location_lat, lng: next.location_lng };
      const minutes = await getTravelMinutes(origin, destination);
      return minutes === null || minutes < 3
        ? null
        : {
            from: e.title,
            to: next.title,
            minutes,
            url: directionsUrl(origin, destination),
          };
    }),
  );
  const travelLegs = legs.filter((l): l is NonNullable<typeof l> => l !== null);

  // PHIL-P10 : ordre de visite suggéré (≥ 3 activités géolocalisées)
  const activityStops = dayEvents
    .filter((e) => e.type === "ACTIVITY" && e.location_lat !== null && e.location_lng !== null)
    .map((e) => ({
      id: e.id,
      title: e.title,
      lat: e.location_lat as number,
      lng: e.location_lng as number,
    }));
  const dayLodging = (events ?? []).find(
    (e) =>
      e.type === "LODGING" &&
      e.location_lat !== null &&
      e.location_lng !== null &&
      eventDayKey(e.starts_at, e.timezone) <= date &&
      (e.ends_at === null || eventDayKey(e.ends_at, e.timezone) >= date),
  );
  const visitSuggestion = suggestVisitOrder(
    activityStops,
    dayLodging
      ? { lat: dayLodging.location_lat as number, lng: dayLodging.location_lng as number }
      : null,
  );

  const label = formatInTimeZone(`${date}T12:00:00Z`, "UTC", "EEEE d MMMM yyyy", {
    locale: dfLocale,
  });
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/trips/${tripId}`}
        className="text-sm text-encre-douce underline underline-offset-4 hover:text-encre"
      >
        {t("calendar.backToCalendar")}
      </Link>
      <h1 className="mt-2 font-display text-2xl text-encre capitalize">{label}</h1>
      {dayWeather ? (
        <p className="mt-1">
          <WeatherLine day={dayWeather} />
        </p>
      ) : null}
      {visitSuggestion ? (
        <div className="mt-2 rounded-md border border-laiton/50 bg-laiton/5 px-3 py-2">
          <p className="mb-0.5 text-[0.65rem] font-medium text-laiton uppercase tracking-wide">
            {t("calendar.day.visitOrderLabel")}
          </p>
          <p className="text-xs text-encre">
            {dayLodging ? t("calendar.day.fromLodging") : ""}
            {visitSuggestion.order.map((s) => s.title).join(" → ")}
          </p>
          <p className="text-[0.65rem] text-encre-douce">
            ≈ {Math.round(visitSuggestion.suggestedKm)} {t("calendar.day.kmUnit")}{" "}
            {t("calendar.day.insteadOf")} {Math.round(visitSuggestion.currentKm)}{" "}
            {t("calendar.day.asCrowFlies")}
          </p>
        </div>
      ) : null}
      {travelLegs.length > 0 ? (
        <div className="mt-2 rounded-md border border-laiton-clair/60 bg-papier px-3 py-2">
          <p className="mb-0.5 text-[0.65rem] font-medium text-laiton uppercase tracking-wide">
            {t("calendar.day.travelLegsLabel")}
          </p>
          {travelLegs.map((leg) => (
            <p key={`${leg.from}-${leg.to}`} className="text-xs text-encre-douce">
              {leg.from} → {leg.to} :{" "}
              <span className="text-encre">{formatMinutes(leg.minutes)}</span>
              {" · "}
              <a
                href={leg.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-bordeaux underline underline-offset-2 hover:opacity-80"
              >
                <Navigation className="size-3" aria-hidden="true" /> {t("calendar.day.directions")}
              </a>
            </p>
          ))}
        </div>
      ) : null}
      <div className="mb-4" />

      {dayEvents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-6 py-14 text-center">
          <p className="font-display text-xl text-encre italic">{t("calendar.day.freeDayTitle")}</p>
          <p className="mt-2 text-sm text-encre-douce">{t("calendar.day.freeDayBody")}</p>
        </div>
      ) : (
        <div className="relative rounded-lg border border-laiton-clair bg-papier">
          {/* Grille des heures */}
          {hours.map((h) => (
            <div
              key={h}
              className="flex items-start gap-3 border-b border-laiton-clair/30 last:border-b-0"
              style={{ height: HOUR_HEIGHT }}
            >
              <span className="w-12 shrink-0 pt-1 pl-2 text-xs text-encre-douce tabular-nums">
                {String(h).padStart(2, "0")}h
              </span>
            </div>
          ))}
          {/* Événements positionnés */}
          <div className="absolute inset-y-0 right-2 left-16">
            {dayEvents.map((event) => {
              const { top, height } = eventOffsets(event);
              return (
                <Link
                  key={event.id}
                  href={`/trips/${tripId}/events/${event.id}`}
                  className={cn(
                    "absolute right-0 left-0 flex items-start gap-2 overflow-hidden rounded-md border px-3 py-1.5 transition-shadow hover:shadow-[0_2px_12px_rgba(31,42,68,0.15)]",
                    event.type === "TRANSPORT" && "border-encre/30 bg-encre/5",
                    event.type === "LODGING" && "border-laiton bg-laiton/10",
                    event.type === "ACTIVITY" && "border-bordeaux/30 bg-bordeaux/5",
                  )}
                  style={{ top, height, minHeight: 40 }}
                >
                  <EventTypeIcon type={event.type} className="mt-0.5 size-6 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-encre">
                      {event.title}
                    </span>
                    <span className="block text-xs text-encre-douce">
                      {eventTime(event.starts_at, event.timezone)}
                      {event.ends_at ? ` → ${eventTime(event.ends_at, event.timezone)}` : ""}
                      {event.location_name ? ` · ${event.location_name}` : ""}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <DayJournal
        tripId={tripId}
        day={date}
        entries={(journalRows ?? []).map(
          (r): JournalEntry => ({
            authorId: r.author_id,
            authorName: r.profiles?.display_name ?? t("calendar.traveler"),
            body: r.body,
          }),
        )}
        myId={user.id}
      />
    </div>
  );
}
