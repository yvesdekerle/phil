import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { notFound } from "next/navigation";
import { EventTypeIcon } from "@/components/calendar/event-type-icon";
import type { MapMarker } from "@/components/map/trip-map";
import { TripMapLazy } from "@/components/map/trip-map-lazy";
import { eventTime, groupEventsByDay } from "@/lib/events/datetime";
import type { TripEvent } from "@/lib/events/types";
import { getT } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { palette } from "@/lib/ui/colors";
import { areUuids } from "@/lib/validation";

const MARKER_COLORS: Record<string, string> = {
  TRANSPORT: palette.ink,
  LODGING: palette.mist,
  ACTIVITY: palette.lagoonInk,
};

/**
 * Page publique d'un voyage (PHIL-P03) — lecture seule, façon Polarsteps :
 * itinéraire + carte, rien d'autre. Lecture via service role, filtrée ici :
 * aucune policy RLS anonyme n'est ouverte, aucun document/budget/note ne sort.
 */
export default async function PublicTripPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!areUuids(token)) {
    notFound();
  }

  const t = await getT();
  const admin = createAdminClient();
  const { data: trip } = await admin
    .from("trips")
    .select("id, name, destination, start_date, end_date, cover_image_url")
    .eq("public_token", token)
    .single();
  if (!trip) {
    notFound();
  }

  const { data: eventsData } = await admin
    .from("trip_events")
    .select(
      "id, type, title, starts_at, ends_at, timezone, location_name, location_lat, location_lng",
    )
    .eq("trip_id", trip.id)
    .order("starts_at", { ascending: true });

  const events = (eventsData ?? []) as TripEvent[];
  const days = groupEventsByDay(events);
  const markers: MapMarker[] = events
    .filter((e) => e.location_lat !== null && e.location_lng !== null)
    .map((e, i) => ({
      id: e.id,
      lat: e.location_lat as number,
      lng: e.location_lng as number,
      title: e.title,
      subtitle: t(`events.type.${e.type}`),
      color: MARKER_COLORS[e.type] ?? palette.lagoonInk,
      order: i,
    }));

  const dateRange = `${format(new Date(trip.start_date), "d MMMM", { locale: fr })} — ${format(
    new Date(trip.end_date),
    "d MMMM yyyy",
    { locale: fr },
  )}`;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <p className="text-xs text-mist uppercase tracking-widest">{t("public.eyebrow")}</p>
      <h1 className="mt-1 font-sans text-3xl text-ink">{trip.name}</h1>
      <p className="mt-1 text-sm text-slate">
        {trip.destination} · {dateRange}
      </p>

      {markers.length > 0 ? (
        <div className="mt-6">
          <TripMapLazy markers={markers} drawPath />
        </div>
      ) : null}

      <section className="mt-8 flex flex-col gap-6">
        {days.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line bg-card/60 px-6 py-10 text-center text-sm text-slate">
            {t("public.emptyItinerary")}
          </p>
        ) : (
          days.map((day) => (
            <section key={day.dayKey}>
              <h2 className="mb-2 text-sm font-medium text-slate capitalize">{day.label}</h2>
              <ul className="flex flex-col gap-2">
                {day.events.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center gap-3 rounded-lg border border-line bg-card px-4 py-3"
                  >
                    <span className="w-14 shrink-0 text-sm font-medium text-ink tabular-nums">
                      {eventTime(event.starts_at, event.timezone)}
                    </span>
                    <EventTypeIcon type={event.type} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {event.title}
                      </span>
                      {event.location_name ? (
                        <span className="block truncate text-xs text-slate">
                          {event.location_name}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </section>

      <footer className="mt-10 border-t border-line/50 pt-4 text-center text-xs text-slate">
        {t("public.footer")}
      </footer>
    </main>
  );
}
