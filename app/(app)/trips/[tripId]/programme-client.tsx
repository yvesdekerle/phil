"use client";

import { eachDayOfInterval, format, parseISO } from "date-fns";
import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { EventTypeIcon } from "@/components/calendar/event-type-icon";
import { useLocale, useT } from "@/components/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { eventDayKey, eventTime, groupEventsByDay } from "@/lib/events/datetime";
import type { TripEvent } from "@/lib/events/types";
import { dateFnsLocale } from "@/lib/i18n/dates";
import { fuzzyMatch } from "@/lib/search/fuzzy";
import { cn } from "@/lib/utils";

/**
 * Programme — vue jour (déclinaison L2a) : bande de dates horizontale (pastilles
 * d'événements, aujourd'hui cerclé citron, jour choisi en encre), ruban du
 * logement couvrant le jour, jour focalisé (badge AUJOURD'HUI, cartes à bord
 * coloré par type, compteur docs), section DEMAIN, et recherche live (PHIL-Q35)
 * qui bascule en liste groupée par jour.
 */

type EventWithDocs = TripEvent & { event_documents?: { count: number }[] };

const TYPE_BORDER: Record<string, string> = {
  TRANSPORT: "border-lagoon-ink",
  LODGING: "border-lagoon-soft",
  ACTIVITY: "border-lagoon",
};

export function ProgrammeClient({
  tripId,
  events,
  todayKey,
  tripStart,
  tripEnd,
  canEdit,
  currentEventId,
  nextEventId,
  travelToNext,
  navigateToNext,
  hasPendingIdeas,
  children,
}: {
  tripId: string;
  events: EventWithDocs[];
  todayKey: string | null;
  tripStart: string;
  tripEnd: string;
  canEdit: boolean;
  currentEventId: string | null;
  nextEventId: string | null;
  travelToNext: string | null;
  navigateToNext: string | null;
  hasPendingIdeas: boolean;
  /** Slot « Ajout rapide » (form server action), affiché en pied de journée. */
  children?: React.ReactNode;
}) {
  const t = useT();
  const locale = useLocale();
  const dfLocale = dateFnsLocale(locale);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const inRange = todayKey && todayKey >= tripStart && todayKey <= tripEnd;
  const [selected, setSelected] = useState(inRange ? (todayKey as string) : tripStart);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: centrage initial uniquement
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, EventWithDocs[]>();
    for (const e of events) {
      const key = eventDayKey(e.starts_at, e.timezone);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  }, [events]);

  const days = useMemo(
    () =>
      eachDayOfInterval({ start: parseISO(tripStart), end: parseISO(tripEnd) }).map((d) => {
        const key = format(d, "yyyy-MM-dd");
        return {
          key,
          weekday: format(d, "EEE", { locale: dfLocale }).replace(".", "").toUpperCase(),
          num: format(d, "d"),
          count: (byDay.get(key) ?? []).length,
        };
      }),
    [tripStart, tripEnd, byDay, dfLocale],
  );

  const searchDays = useMemo(() => {
    if (!deferredQuery.trim()) {
      return null;
    }
    const visible = events.filter((e) =>
      fuzzyMatch(`${e.title} ${e.location_name ?? ""} ${e.notes ?? ""}`, deferredQuery),
    );
    return groupEventsByDay(visible, dfLocale);
  }, [events, deferredQuery, dfLocale]);

  const dayEvents = byDay.get(selected) ?? [];
  const tomorrowKey = days[days.findIndex((d) => d.key === selected) + 1]?.key ?? null;
  const tomorrowEvents = tomorrowKey ? (byDay.get(tomorrowKey) ?? []) : [];
  const selectedLabel = format(parseISO(selected), "EEEE d MMMM", { locale: dfLocale });

  // Logement couvrant le jour choisi (ruban lagune)
  const lodging = events.find((e) => {
    if (e.type !== "LODGING") {
      return false;
    }
    const from = eventDayKey(e.starts_at, e.timezone);
    const to = e.ends_at ? eventDayKey(e.ends_at, e.timezone) : from;
    return from <= selected && selected <= to;
  });

  const docsCount = (e: EventWithDocs) => e.event_documents?.[0]?.count ?? 0;

  const eventCard = (event: EventWithDocs) => (
    <div key={event.id} className="relative">
      <Link
        href={`/trips/${tripId}/events/${event.id}`}
        className={cn(
          "flex items-center gap-3 rounded-lg border border-line p-3 transition-shadow outline-none hover:shadow-card focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand",
          event.id === currentEventId ? "border-citron/60 bg-citron-wash" : "bg-card",
        )}
      >
        <span className="min-w-12 shrink-0 text-center">
          <span className="block font-mono text-base font-bold text-ink tabular-nums">
            {eventTime(event.starts_at, event.timezone)}
          </span>
          {event.ends_at ? (
            <span className="block font-mono text-label text-mist tabular-nums">
              –{eventTime(event.ends_at, event.timezone)}
            </span>
          ) : null}
        </span>
        <span className={cn("min-w-0 flex-1 border-l-[3px] pl-3", TYPE_BORDER[event.type])}>
          <span className="block truncate text-subhead text-ink">{event.title}</span>
          {event.location_name ? (
            <span className="mt-0.5 block truncate text-caption text-slate">
              {event.location_name}
            </span>
          ) : null}
        </span>
        {docsCount(event) > 0 ? (
          <span className="shrink-0 font-mono text-label text-mist uppercase tabular-nums">
            {t("calendar.docs").replace("{n}", String(docsCount(event)))}
          </span>
        ) : null}
      </Link>
      {event.id === nextEventId && navigateToNext ? (
        <div className="mt-1.5 flex items-center justify-end gap-2 pr-1">
          {travelToNext ? <span className="text-caption text-slate">{travelToNext}</span> : null}
          <a
            href={navigateToNext}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-lagoon-ink px-3 py-1 text-caption font-semibold text-white transition-colors outline-none hover:bg-lagoon-hover focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
          >
            Go
          </a>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {events.length > 0 ? (
        <div className="relative max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-mist"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("calendar.searchPlaceholder")}
            className="h-9 w-full rounded-full border border-line bg-card pr-3 pl-8 text-body text-ink outline-none placeholder:text-mist focus-visible:border-lagoon focus-visible:ring-2 focus-visible:ring-citron"
          />
        </div>
      ) : null}

      {searchDays ? (
        searchDays.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-card/60 px-6 py-10 text-center">
            <p className="text-subhead text-ink">{t("calendar.searchEmptyTitle")}</p>
            <p className="mt-1 text-body text-slate">{t("calendar.searchEmptyBody")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {searchDays.map((day) => (
              <section key={day.dayKey}>
                <h2 className="mb-2 font-mono text-label text-mist uppercase tabular-nums">
                  {day.label}
                </h2>
                <ul className="flex flex-col gap-2">
                  {day.events.map((event) => (
                    <li key={event.id}>
                      <Link
                        href={`/trips/${tripId}/events/${event.id}`}
                        className="flex items-center gap-3 rounded-lg border border-line bg-card px-3 py-2.5 transition-shadow outline-none hover:shadow-card focus-visible:ring-2 focus-visible:ring-citron"
                      >
                        <span className="w-12 shrink-0 font-mono text-data text-ink tabular-nums">
                          {eventTime(event.starts_at, event.timezone)}
                        </span>
                        <EventTypeIcon type={event.type} />
                        <span className="min-w-0 flex-1 truncate text-subhead text-ink">
                          {event.title}
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-mist" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )
      ) : (
        <>
          {/* Bande de dates */}
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pt-1 pb-2 lg:mx-0 lg:px-0">
            {days.map((day) => {
              const isSelected = day.key === selected;
              const isToday = day.key === todayKey;
              const isPast = todayKey ? day.key < todayKey : false;
              return (
                <button
                  key={day.key}
                  type="button"
                  ref={isSelected ? selectedRef : undefined}
                  onClick={() => setSelected(day.key)}
                  aria-pressed={isSelected}
                  aria-label={format(parseISO(day.key), "EEEE d MMMM", { locale: dfLocale })}
                  className={cn(
                    "w-11 flex-none rounded-lg py-1.5 text-center transition-all outline-none focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand active:scale-[.98]",
                    isSelected
                      ? "bg-ink shadow-float"
                      : cn(
                          "border bg-card",
                          isToday ? "border-[1.5px] border-citron" : "border-line",
                          isPast && "opacity-65",
                        ),
                  )}
                >
                  <span
                    className={cn(
                      "block font-mono text-label uppercase tabular-nums",
                      isSelected ? "text-lagoon-soft" : "text-mist",
                    )}
                  >
                    {day.weekday}
                  </span>
                  <span
                    className={cn(
                      "block text-subhead tabular-nums",
                      isSelected ? "text-white" : isPast ? "text-slate" : "text-ink",
                    )}
                  >
                    {day.num}
                  </span>
                  <span className="mt-0.5 flex h-1 items-center justify-center gap-1">
                    {day.count === 0 ? (
                      <span className="size-1 rounded-full bg-line" />
                    ) : (
                      Array.from({ length: Math.min(day.count, 3) }, (_, i) => (
                        <span
                          // biome-ignore lint/suspicious/noArrayIndexKey: pastilles décoratives
                          key={i}
                          className={cn(
                            "size-1 rounded-full",
                            isSelected ? "bg-citron" : "bg-lagoon",
                          )}
                        />
                      ))
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Ruban logement */}
          {lodging ? (
            <Link
              href={`/trips/${tripId}/events/${lodging.id}`}
              className="flex items-center rounded-md bg-lagoon-wash px-2.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-citron"
            >
              <span className="truncate font-mono text-label text-lagoon-ink uppercase tabular-nums">
                {lodging.title}
              </span>
            </Link>
          ) : null}

          {/* Jour focalisé */}
          <div className="mt-1 flex items-center gap-2">
            {selected === todayKey ? <Badge variant="citron">{t("calendar.today")}</Badge> : null}
            <Link
              href={`/trips/${tripId}/day/${selected}`}
              title={t("calendar.dayLinkTitle")}
              className="rounded-sm text-body font-bold text-ink capitalize underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-citron"
            >
              {selectedLabel}
            </Link>
            <span className="ml-auto font-mono text-label text-mist uppercase">
              {t("calendar.localTime")}
            </span>
          </div>

          {dayEvents.length === 0 ? (
            <div className="rounded-lg border-[1.5px] border-dashed border-line p-4 text-center text-body text-mist">
              {t("calendar.freeDay")}
            </div>
          ) : (
            <div className="flex flex-col gap-2">{dayEvents.map(eventCard)}</div>
          )}

          {/* Demain */}
          {tomorrowKey ? (
            <>
              <p className="mt-2 text-caption font-bold tracking-wider text-slate uppercase">
                {t("calendar.tomorrow")} —{" "}
                {format(parseISO(tomorrowKey), "EEE d", { locale: dfLocale })}
              </p>
              {tomorrowEvents.length === 0 ? (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-ink p-4">
                  <div className="min-w-0">
                    <p className="text-subhead text-white">{t("calendar.freeDay")}</p>
                    {hasPendingIdeas ? (
                      <p className="mt-0.5 text-caption text-lagoon-soft">
                        {t("calendar.ideasWaiting")}
                      </p>
                    ) : null}
                  </div>
                  {hasPendingIdeas ? (
                    <Link
                      href={`/trips/${tripId}/ideas`}
                      className="shrink-0 rounded-full bg-lagoon-ink px-3 py-1.5 text-caption font-bold text-white transition-colors outline-none hover:bg-lagoon-hover focus-visible:ring-2 focus-visible:ring-citron"
                    >
                      {t("calendar.voteCta")}
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {tomorrowEvents.slice(0, 2).map((event) => (
                    <Link
                      key={event.id}
                      href={`/trips/${tripId}/events/${event.id}`}
                      className="flex items-center gap-3 rounded-lg border border-line bg-card px-3 py-2.5 outline-none hover:shadow-card focus-visible:ring-2 focus-visible:ring-citron"
                    >
                      <span className="w-12 shrink-0 font-mono text-data text-ink tabular-nums">
                        {eventTime(event.starts_at, event.timezone)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-subhead text-ink">
                        {event.title}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-mist" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : null}

          {canEdit ? <div className="mt-2">{children}</div> : null}
        </>
      )}
    </div>
  );
}
