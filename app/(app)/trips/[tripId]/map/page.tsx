import Link from "next/link";
import { redirect } from "next/navigation";
import type { MapMarker } from "@/components/map/trip-map";
import { TripMapLazy } from "@/components/map/trip-map-lazy";
import { eventDayKey, eventTime, groupEventsByDay } from "@/lib/events/datetime";
import type { TripEvent } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  TRANSPORT: "#1f2a44",
  LODGING: "#3f6e5a", // vert wagon : les hébergements se repèrent au premier coup d'œil
  ACTIVITY: "#6e1f2e",
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: events }, { data: ideas }] = await Promise.all([
    supabase.from("trip_events").select("*").eq("trip_id", tripId).order("starts_at"),
    supabase.from("trip_ideas").select("*").eq("trip_id", tripId).neq("status", "DISMISSED"),
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
      color: "#6e1f2e",
    }));
    // L'hébergement en repère sur la carte des idées
    if (lodgingOfDay) {
      markers.push({
        id: lodgingOfDay.id,
        lat: lodgingOfDay.location_lat as number,
        lng: lodgingOfDay.location_lng as number,
        title: lodgingOfDay.title,
        subtitle: "Hébergement",
        color: "#3f6e5a",
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
      color: TYPE_COLORS[e.type] ?? "#6e1f2e",
      order: idx,
      house: e.type === "LODGING",
      label: e.type === "LODGING" ? undefined : String(++step),
    }));
  }

  const chip = (href: string, label: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-bordeaux bg-bordeaux text-papier"
          : "border-laiton-clair bg-papier text-encre-douce hover:text-encre",
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/trips/${tripId}`}
          className="text-sm text-encre-douce underline underline-offset-4 hover:text-encre"
        >
          ← Retour au calendrier
        </Link>
        <div className="flex gap-1.5">
          {chip(`/trips/${tripId}/map`, "Programme", !showIdeas)}
          {chip(`/trips/${tripId}/map?view=ideas`, "Idées", showIdeas)}
        </div>
      </div>

      {!showIdeas && days.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          {chip(`/trips/${tripId}/map`, "Tout le voyage", !activeDay)}
          {days.map((d) =>
            chip(
              `/trips/${tripId}/map?day=${d.dayKey}`,
              d.label.replace(/ \d{4}$/, ""),
              activeDay === d.dayKey,
            ),
          )}
        </div>
      ) : null}

      <TripMapLazy markers={markers} drawPath={!showIdeas} distanceFrom={distanceFrom} />

      <p className="text-xs text-encre-douce">
        {markers.length} lieu{markers.length > 1 ? "x" : ""} sur la carte
        {missing > 0
          ? ` · ${missing} sans position (précise le lieu dans la fiche pour les placer)`
          : ""}
        {distanceFrom ? ` · distances calculées depuis ${distanceFrom.label}` : ""}
      </p>
    </div>
  );
}
