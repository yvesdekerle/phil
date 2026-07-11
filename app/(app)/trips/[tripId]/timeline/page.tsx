import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TripViewToggle } from "@/components/calendar/trip-view-toggle";
import { eventDayKey, eventTime } from "@/lib/events/datetime";
import type { TripEvent } from "@/lib/events/types";
import { getDateFnsLocale, getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

/**
 * Timeline (PHIL-F03, refonte L2b/L2c) :
 * mobile — **ruban vertical multi-jours** : une rangée par jour (code 2
 * lettres + n° mono), rail du logement continu, chips d'événements qui
 * s'empilent (vols en livrée sombre mono), aujourd'hui lavé citron ;
 * desktop — **couloirs par catégorie** : 3 couloirs (Transport / Logement /
 * Activités) sur la grille des jours, le séjour entier sans scroller, la
 * villa en un seul bloc IN → OUT, colonne d'aujourd'hui lavée citron.
 */
const LANES = ["TRANSPORT", "LODGING", "ACTIVITY"] as const;

export default async function TimelinePage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const t = await getT();
  const dfLocale = await getDateFnsLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: trip }, { data: eventsData }] = await Promise.all([
    supabase
      .from("trips")
      .select("start_date, end_date, default_timezone")
      .eq("id", tripId)
      .single(),
    supabase.from("trip_events").select("*").eq("trip_id", tripId).order("starts_at"),
  ]);
  if (!trip) {
    notFound();
  }
  const events = (eventsData ?? []) as TripEvent[];

  // L'axe couvre le voyage, élargi aux événements qui débordent (vol aller…)
  let axisStart = parseISO(trip.start_date);
  let axisEnd = parseISO(trip.end_date);
  for (const e of events) {
    const s = parseISO(eventDayKey(e.starts_at, e.timezone));
    const f = parseISO(eventDayKey(e.ends_at ?? e.starts_at, e.timezone));
    if (s < axisStart) {
      axisStart = s;
    }
    if (f > axisEnd) {
      axisEnd = f;
    }
  }
  const dayCount = differenceInCalendarDays(axisEnd, axisStart) + 1;
  const days = Array.from({ length: dayCount }, (_, i) => {
    const d = addDays(axisStart, i);
    return {
      key: format(d, "yyyy-MM-dd"),
      weekday: format(d, "EEEEEE", { locale: dfLocale }).replace(".", "").toUpperCase(),
      num: format(d, "dd"),
      idx: i,
    };
  });
  const todayKey = eventDayKey(new Date().toISOString(), trip.default_timezone);

  const spanOf = (e: TripEvent) => {
    const startIdx = differenceInCalendarDays(
      parseISO(eventDayKey(e.starts_at, e.timezone)),
      axisStart,
    );
    const endIdx = differenceInCalendarDays(
      parseISO(eventDayKey(e.ends_at ?? e.starts_at, e.timezone)),
      axisStart,
    );
    return { startIdx, endIdx, span: Math.max(1, endIdx - startIdx + 1) };
  };

  const lodgings = events.filter((e) => e.type === "LODGING").map((e) => ({ e, ...spanOf(e) }));
  const coveredByLodging = (idx: number) =>
    lodgings.find((l) => l.startIdx <= idx && idx <= l.endIdx);

  // Chips du jour (mobile) : chaque événement au jour de son départ — le
  // logement n'apparaît qu'au check-in, le rail couvre les nuits suivantes.
  const chipsOfDay = (idx: number) =>
    events.map((e) => ({ e, ...spanOf(e) })).filter(({ startIdx }) => startIdx === idx);

  const chip = (e: TripEvent, opts?: { multiDay?: boolean }) => {
    const time = eventTime(e.starts_at, e.timezone);
    if (e.type === "TRANSPORT") {
      return (
        <Link
          key={e.id}
          href={`/trips/${tripId}/events/${e.id}`}
          className="rounded-md bg-ink-deep px-2 py-1 font-mono text-label whitespace-nowrap text-white tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-citron"
        >
          ✈ {time} {e.title}
          {opts?.multiDay ? " ↘" : ""}
        </Link>
      );
    }
    return (
      <Link
        key={e.id}
        href={`/trips/${tripId}/events/${e.id}`}
        className="rounded-md border border-line bg-card px-2 py-1 text-caption font-semibold whitespace-nowrap text-ink outline-none focus-visible:ring-2 focus-visible:ring-citron"
      >
        {e.title} {time}
      </Link>
    );
  };

  return (
    <div className="flex flex-col gap-4 pb-16">
      <div className="flex items-end justify-between gap-3 border-b border-line">
        <TripViewToggle tripId={tripId} active="timeline" />
        <span className="pb-2 font-mono text-caption font-semibold text-slate uppercase tabular-nums">
          {dayCount} {t("calendar.timeline.days")}
        </span>
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-card/60 px-6 py-14 text-center">
          <p className="text-subhead text-ink">{t("calendar.timeline.emptyTitle")}</p>
          <p className="mt-2 text-body text-slate">{t("calendar.timeline.emptyBody")}</p>
        </div>
      ) : (
        <>
          {/* Mobile — ruban vertical multi-jours (L2b) */}
          <div className="flex flex-col lg:hidden">
            {days.map((day) => {
              const isToday = day.key === todayKey;
              const lodging = coveredByLodging(day.idx);
              const dayChips = chipsOfDay(day.idx);
              return (
                <div
                  key={day.key}
                  className={cn(
                    "flex min-h-8 items-stretch gap-2",
                    isToday ? "rounded-lg bg-citron/15" : "border-t border-wash",
                  )}
                >
                  <Link
                    href={`/trips/${tripId}/day/${day.key}`}
                    className="w-13 flex-none rounded-sm pt-1.5 pl-1 outline-none focus-visible:ring-2 focus-visible:ring-citron"
                  >
                    <span
                      className={cn(
                        "font-mono text-label uppercase tabular-nums",
                        isToday ? "font-bold text-ink" : "text-mist",
                      )}
                    >
                      {day.weekday}{" "}
                    </span>
                    <span className="font-mono text-data text-ink tabular-nums">{day.num}</span>
                  </Link>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "w-2 flex-none",
                      lodging &&
                        cn(
                          "border-lagoon-soft bg-lagoon-wash",
                          lodging.startIdx === day.idx
                            ? "rounded-t-[5px] border-x border-t"
                            : lodging.endIdx === day.idx
                              ? "rounded-b-[5px] border-x border-b"
                              : "border-x",
                        ),
                    )}
                  />
                  <span className="flex flex-1 flex-wrap content-start gap-1 py-1">
                    {dayChips.length === 0 && !lodging ? (
                      <span className="rounded-md border border-dashed border-line px-2 py-1 text-caption font-semibold text-mist">
                        {t("calendar.freeDay").toLowerCase()}
                      </span>
                    ) : (
                      dayChips.map(({ e, span }) => chip(e, { multiDay: span > 1 }))
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Desktop — couloirs par catégorie (L2c) */}
          <div className="relative hidden overflow-hidden rounded-lg border border-line bg-card lg:block">
            {/* Colonne d'aujourd'hui lavée citron */}
            {days.some((d) => d.key === todayKey) ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 bg-citron/15"
                style={{
                  left: `calc(88px + ${days.findIndex((d) => d.key === todayKey)} * (100% - 88px) / ${dayCount})`,
                  width: `calc((100% - 88px) / ${dayCount})`,
                }}
              />
            ) : null}
            {/* En-tête des jours */}
            <div
              className="relative grid border-b border-line"
              style={{ gridTemplateColumns: `88px repeat(${dayCount}, minmax(0, 1fr))` }}
            >
              <div />
              {days.map((day) => (
                <div key={day.key} className="border-l border-wash py-1.5 text-center">
                  <p className="font-mono text-label text-mist uppercase tabular-nums">
                    {day.weekday}
                  </p>
                  <p className="font-mono text-data text-ink tabular-nums">{day.num}</p>
                </div>
              ))}
            </div>
            {LANES.map((lane) => {
              const laneEvents = events
                .filter((e) => e.type === lane)
                .map((e) => ({ e, ...spanOf(e) }));
              if (laneEvents.length === 0) {
                return null;
              }
              return (
                <div
                  key={lane}
                  className="relative grid items-start border-b border-wash py-1.5 last:border-b-0"
                  style={{
                    gridTemplateColumns: `88px repeat(${dayCount}, minmax(0, 1fr))`,
                    gridAutoFlow: "row dense",
                  }}
                >
                  <p className="px-3 pt-1.5 font-mono text-label text-mist uppercase">
                    {t(`events.type.${lane}`)}
                  </p>
                  {laneEvents.map(({ e, startIdx, span }) => (
                    <div
                      key={e.id}
                      className="min-w-0 px-0.5 py-0.5"
                      style={{ gridColumn: `${startIdx + 2} / span ${span}` }}
                    >
                      {lane === "LODGING" ? (
                        <Link
                          href={`/trips/${tripId}/events/${e.id}`}
                          className="block truncate rounded-md border border-lagoon-soft bg-lagoon-wash px-2 py-1.5 text-caption font-semibold text-lagoon-ink outline-none focus-visible:ring-2 focus-visible:ring-citron"
                        >
                          {e.title}
                        </Link>
                      ) : lane === "TRANSPORT" ? (
                        <Link
                          href={`/trips/${tripId}/events/${e.id}`}
                          className="block truncate rounded-md bg-ink-deep px-2 py-1.5 font-mono text-label text-white tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-citron"
                        >
                          ✈ {eventTime(e.starts_at, e.timezone)} {e.title}
                        </Link>
                      ) : (
                        <Link
                          href={`/trips/${tripId}/events/${e.id}`}
                          className="block truncate rounded-md border border-line bg-card px-2 py-1.5 text-caption font-semibold text-ink outline-none hover:shadow-card focus-visible:ring-2 focus-visible:ring-citron"
                        >
                          {e.title} {eventTime(e.starts_at, e.timezone)}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
