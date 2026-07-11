import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TripViewToggle } from "@/components/calendar/trip-view-toggle";
import { eventDayKey, eventTime } from "@/lib/events/datetime";
import type { TripEvent } from "@/lib/events/types";
import { getDateFnsLocale, getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { palette } from "@/lib/ui/colors";
import { cn } from "@/lib/utils";

/**
 * Timeline (PHIL-F03, refonte L2b puis retour V06c) :
 * mobile — **ruban vertical multi-jours** : une rangée par jour (code 2
 * lettres + n° mono), rail du logement continu, chips d'événements qui
 * s'empilent (vols en livrée sombre mono), aujourd'hui lavé citron ;
 * desktop — **Gantt horizontal scrollable** : 155 px par jour, colonne des
 * noms figée à gauche, en-tête des jours figé en haut, une ligne par
 * événement (les couloirs compressés de L2c étaient illisibles sur un
 * voyage long — retour d'Yves).
 */
const LANES = ["TRANSPORT", "LODGING", "ACTIVITY"] as const;
const DAY_WIDTH = 155; // px par jour — assez pour lire les libellés
const LABEL_W = 220; // px de la colonne fixe des noms

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
  const todayIdx = days.findIndex((d) => d.key === todayKey);
  // Filets verticaux entre les jours (V06c) — la zone sous la colonne des
  // noms est recouverte par sa cellule sticky opaque.
  const dayGrid = {
    backgroundImage: `repeating-linear-gradient(to right, ${palette.line} 0, ${palette.line} 1px, transparent 1px, transparent ${DAY_WIDTH}px)`,
    backgroundPosition: `${LABEL_W}px 0`,
  } as const;

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

          {/* Desktop — Gantt horizontal scrollable (V06c) */}
          <div className="hidden max-h-[calc(100dvh-11rem)] overflow-auto rounded-lg border border-line bg-card lg:block">
            <div className="relative" style={{ width: LABEL_W + dayCount * DAY_WIDTH }}>
              {/* Colonne d'aujourd'hui lavée citron */}
              {todayIdx >= 0 ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 z-10 bg-citron/15"
                  style={{ left: LABEL_W + todayIdx * DAY_WIDTH, width: DAY_WIDTH }}
                />
              ) : null}
              {/* En-tête des jours — figé en haut, colonne des noms figée à gauche */}
              <div className="sticky top-0 z-30 flex border-b border-line bg-card">
                <div
                  className="sticky left-0 z-40 shrink-0 border-r border-line bg-card"
                  style={{ width: LABEL_W }}
                />
                {days.map((day) => (
                  <div
                    key={day.key}
                    className={cn(
                      "shrink-0 border-l border-wash py-1.5 text-center first-of-type:border-l-0",
                      day.key === todayKey && "bg-citron/15",
                    )}
                    style={{ width: DAY_WIDTH }}
                  >
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
                  <div key={lane} className="border-b border-line last:border-b-0">
                    <p className="sticky left-0 z-20 w-fit px-3 pt-2 pb-1 font-mono text-label text-mist uppercase">
                      {t(`events.type.${lane}`)}
                    </p>
                    {laneEvents.map(({ e, startIdx, span }) => (
                      <div key={e.id} className="flex items-center py-0.5" style={dayGrid}>
                        <div
                          className="sticky left-0 z-20 flex shrink-0 items-center self-stretch border-r border-line bg-card px-3"
                          style={{ width: LABEL_W }}
                          title={e.title}
                        >
                          <span className="truncate text-caption font-semibold text-slate">
                            {e.title}
                          </span>
                        </div>
                        <div className="relative h-8" style={{ width: dayCount * DAY_WIDTH }}>
                          <Link
                            href={`/trips/${tripId}/events/${e.id}`}
                            className={cn(
                              "absolute inset-y-0.5 flex items-center overflow-hidden rounded-md px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-citron",
                              e.type === "TRANSPORT" &&
                                "bg-ink-deep font-mono text-label text-white tabular-nums",
                              e.type === "LODGING" &&
                                "border border-lagoon-soft bg-lagoon-wash text-caption font-semibold text-lagoon-ink",
                              e.type === "ACTIVITY" &&
                                "border border-line bg-card text-caption font-semibold text-ink transition-shadow hover:shadow-card",
                            )}
                            style={{ left: startIdx * DAY_WIDTH + 2, width: span * DAY_WIDTH - 4 }}
                          >
                            <span className="truncate">
                              {e.type === "TRANSPORT"
                                ? `✈ ${eventTime(e.starts_at, e.timezone)} ${e.title}`
                                : e.type === "ACTIVITY"
                                  ? `${eventTime(e.starts_at, e.timezone)} · ${e.title}`
                                  : e.title}
                            </span>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
