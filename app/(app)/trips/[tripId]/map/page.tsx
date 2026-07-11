import { redirect } from "next/navigation";
import { TripViewToggle } from "@/components/calendar/trip-view-toggle";
import type { MapMarker } from "@/components/map/trip-map";
import { TripMapExplorer } from "@/components/map/trip-map-explorer";
import { TripPlaces } from "@/components/map/trip-places";
import { FilterSelect } from "@/components/ui/filter-select";
import { eventDayKey, eventTime, groupEventsByDay } from "@/lib/events/datetime";
import type { TripEvent } from "@/lib/events/types";
import { haversineKm } from "@/lib/geo/distance";
import { geocode } from "@/lib/geo/geocode";
import { formatMinutes, getTravelMinutes } from "@/lib/geo/travel-time";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { palette } from "@/lib/ui/colors";

const TYPE_COLORS: Record<string, string> = {
  TRANSPORT: palette.ink,
  LODGING: palette.lagoon, // vert wagon : les hébergements se repèrent au premier coup d'œil
  ACTIVITY: palette.lagoonInk,
};

/** Cartes du voyage (PHIL-N01) : programme jour par jour, ou idées. */
export default async function TripMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ view?: string; day?: string }>;
}) {
  const { tripId } = await params;
  const { view, day } = await searchParams;
  const showIdeas = view === "ideas";
  const t = await getT();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: events }, { data: ideas }, { data: places }, { data: me }] = await Promise.all([
    supabase.from("trip_events").select("*").eq("trip_id", tripId).order("starts_at"),
    supabase.from("trip_ideas").select("*").eq("trip_id", tripId).neq("status", "DISMISSED"),
    supabase
      .from("trip_places")
      .select("id, name, category, lat, lng, note, created_by")
      .eq("trip_id", tripId),
    supabase
      .from("trip_participants")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single(),
  ]);

  const allEvents = (events ?? []) as TripEvent[];
  const days = groupEventsByDay(allEvents);
  const activeDay = day && days.some((d) => d.dayKey === day) ? day : null;

  // Hébergement de référence pour les distances : celui du jour filtré, sinon le premier
  const lodgings = allEvents.filter((e) => e.type === "LODGING" && e.location_lat != null);
  const lodgingOfDay = activeDay
    ? (lodgings.find(
        (l) =>
          eventDayKey(l.starts_at, l.timezone) <= activeDay &&
          (!l.ends_at || eventDayKey(l.ends_at, l.timezone) >= activeDay),
      ) ?? lodgings[0])
    : lodgings[0];
  const distanceFrom = lodgingOfDay
    ? {
        lat: lodgingOfDay.location_lat as number,
        lng: lodgingOfDay.location_lng as number,
        label: lodgingOfDay.title,
      }
    : null;

  let markers: MapMarker[];
  let missing: number;
  if (showIdeas) {
    const located = (ideas ?? []).filter((i) => i.location_lat != null && i.location_lng != null);
    missing = (ideas ?? []).length - located.length;
    markers = located.map((i) => ({
      id: i.id,
      lat: i.location_lat as number,
      lng: i.location_lng as number,
      title: i.title,
      subtitle: i.location_name ?? undefined,
      color: palette.lagoonInk,
    }));
    // L'hébergement en repère sur la carte des idées
    if (lodgingOfDay) {
      markers.push({
        id: lodgingOfDay.id,
        lat: lodgingOfDay.location_lat as number,
        lng: lodgingOfDay.location_lng as number,
        title: lodgingOfDay.title,
        subtitle: t("map.lodging"),
        color: palette.lagoon,
        house: true,
      });
    }
  } else {
    const filtered = activeDay
      ? allEvents.filter((e) => eventDayKey(e.starts_at, e.timezone) === activeDay)
      : allEvents;
    const located = filtered.filter((e) => e.location_lat != null && e.location_lng != null);
    missing = filtered.length - located.length;
    // PHIL-Q15 : numérotation chronologique (les hébergements gardent leur maison)
    let step = 0;
    markers = located.map((e, idx) => ({
      id: e.id,
      lat: e.location_lat as number,
      lng: e.location_lng as number,
      title: e.title,
      subtitle: `${eventTime(e.starts_at, e.timezone)}${e.location_name ? ` · ${e.location_name}` : ""}`,
      href: `/trips/${tripId}/events/${e.id}`,
      color: TYPE_COLORS[e.type] ?? palette.lagoonInk,
      order: idx,
      house: e.type === "LODGING",
      label: e.type === "LODGING" ? undefined : String(++step),
    }));

    // PHIL-Q25 : le voyage part de la maison — origine du premier transport
    if (!activeDay) {
      const firstTransport = allEvents.find(
        (e) => e.type === "TRANSPORT" && (e.metadata as { from?: string })?.from,
      );
      const from = (firstTransport?.metadata as { from?: string })?.from;
      if (from) {
        const homeCoords = await geocode(from);
        if (homeCoords) {
          markers.unshift({
            id: "depart-maison",
            lat: homeCoords.lat,
            lng: homeCoords.lng,
            title: `${t("map.departure")} : ${from}`,
            subtitle: t("map.departureSubtitle"),
            color: palette.ink,
            order: -1,
            house: true,
          });
        }
      }
    }
  }

  // PHIL-S02 : commerces repérés — marqueurs distincts, hors tracé d'itinéraire.
  for (const p of places ?? []) {
    markers.push({
      id: `place-${p.id}`,
      lat: p.lat,
      lng: p.lng,
      title: p.name,
      subtitle: p.note ?? t(`places.cat.${p.category}`),
      color: "#c2410c",
      noPath: true,
    });
  }

  // PHIL-Q25 : programme de la journée filtrée, avec distance et temps depuis le point d'avant
  type DayLeg = { km: number; minutes: number | null };
  let dayProgram: { event: TripEvent; leg: DayLeg | null }[] = [];
  if (!showIdeas && activeDay) {
    const dayEvents = allEvents.filter((e) => eventDayKey(e.starts_at, e.timezone) === activeDay);
    dayProgram = await Promise.all(
      dayEvents.map(async (e, i) => {
        const prev = dayEvents[i - 1];
        if (
          !prev ||
          prev.location_lat == null ||
          prev.location_lng == null ||
          e.location_lat == null ||
          e.location_lng == null
        ) {
          return { event: e, leg: null };
        }
        const a = { lat: prev.location_lat, lng: prev.location_lng };
        const b = { lat: e.location_lat, lng: e.location_lng };
        const km = haversineKm(a, b);
        return {
          event: e,
          leg: km < 0.3 ? null : { km, minutes: await getTravelMinutes(a, b) },
        };
      }),
    );
  }

  // Liste de gauche : programme riche du jour (avec distances), sinon tous les lieux
  const showDayProgram = !showIdeas && !!activeDay && dayProgram.length > 0;
  const listHeading = showIdeas
    ? t("map.ideas")
    : activeDay
      ? t("map.dayProgram")
      : t("map.allPlaces");
  const departureId = markers.some((m) => m.id === "depart-maison") ? "depart-maison" : null;
  const dayRows = showDayProgram
    ? dayProgram.map(({ event, leg }) => ({
        id: event.id,
        title: event.title,
        time: eventTime(event.starts_at, event.timezone),
        type: event.type,
        legText: leg
          ? `↓ ${leg.km.toFixed(leg.km < 10 ? 1 : 0)} km${
              leg.minutes !== null && leg.minutes >= 3
                ? ` · ${formatMinutes(leg.minutes)} ${t("map.byRoad")}`
                : ""
            }`
          : null,
      }))
    : null;

  return (
    // Pleine largeur (PHIL-Q37b) : la carte déborde du gabarit habituel
    <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[104rem] flex-col gap-4">
        <TripViewToggle tripId={tripId} active="carte" />
        {/* TREK-style : liste cliquable à gauche, grande carte à droite */}
        <TripMapExplorer
          markers={markers}
          departureId={departureId}
          dayRows={dayRows}
          heading={listHeading}
          drawPath={!showIdeas}
          distanceFrom={distanceFrom}
          distanceLabel={distanceFrom?.label ?? null}
          missing={missing}
          filter={
            !showIdeas && days.length > 1 ? (
              <FilterSelect
                key="day-filter"
                value={activeDay ?? ""}
                ariaLabel={t("map.dayFilter")}
                options={[
                  { value: "", label: t("map.wholeTrip"), href: `/trips/${tripId}/map` },
                  ...days.map((d) => ({
                    value: d.dayKey,
                    label: d.label.replace(/ \d{4}$/, ""),
                    href: `/trips/${tripId}/map?day=${d.dayKey}`,
                  })),
                ]}
              />
            ) : null
          }
        />
        <TripPlaces
          tripId={tripId}
          places={places ?? []}
          myId={user.id}
          isOwner={me?.role === "OWNER"}
        />
      </div>
    </div>
  );
}
