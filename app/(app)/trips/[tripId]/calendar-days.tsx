"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { EventTypeIcon } from "@/components/calendar/event-type-icon";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { eventTime, groupEventsByDay } from "@/lib/events/datetime";
import type { TripEvent } from "@/lib/events/types";
import { fuzzyMatch } from "@/lib/search/fuzzy";
import { cn } from "@/lib/utils";

/**
 * Liste du calendrier avec recherche **live** (PHIL-Q35) — filtrage tolérant
 * côté client, différé via useDeferredValue : l'input reste réactif, la liste
 * se met à jour sans recharger la page.
 */
export function CalendarDays({
  tripId,
  events,
  todayKey,
  canEdit,
}: {
  tripId: string;
  events: TripEvent[];
  todayKey: string | null;
  canEdit: boolean;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const days = useMemo(() => {
    const visible = deferredQuery.trim()
      ? events.filter((e) =>
          fuzzyMatch(`${e.title} ${e.location_name ?? ""} ${e.notes ?? ""}`, deferredQuery),
        )
      : events;
    return groupEventsByDay(visible);
  }, [events, deferredQuery]);

  return (
    <div className="flex flex-col gap-6">
      {events.length > 0 ? (
        <div className="relative max-w-xs">
          <Search
            className="pointer-events-none absolute top-2 left-2.5 size-4 text-encre-douce"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("calendar.searchPlaceholder")}
            className="h-8 w-full rounded-full border border-laiton-clair bg-papier pr-3 pl-8 text-sm text-encre placeholder:text-encre-douce/70 focus:outline-none focus:ring-1 focus:ring-laiton"
          />
        </div>
      ) : null}

      {days.length > 0 ? (
        <p className="-mt-3 -mb-3 text-right text-xs text-encre-douce">
          {t("calendar.localTimeNote")}
        </p>
      ) : null}

      {days.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-6 py-14 text-center">
          <p className="font-display text-xl text-encre italic">
            {deferredQuery ? t("calendar.searchEmptyTitle") : t("calendar.emptyTitle")}
          </p>
          <p className="max-w-sm text-sm text-encre-douce">
            {deferredQuery ? t("calendar.searchEmptyBody") : t("calendar.emptyBody")}
          </p>
          {canEdit && !deferredQuery ? (
            <Button asChild className="mt-1">
              <Link href={`/trips/${tripId}/events/new`}>{t("calendar.addEvent")}</Link>
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
                  title={t("calendar.dayLinkTitle")}
                >
                  {day.label}
                </Link>
                {day.dayKey === todayKey ? (
                  <span className="rounded-full bg-bordeaux px-2 py-0.5 text-[0.65rem] font-medium text-papier uppercase">
                    {t("calendar.today")}
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
