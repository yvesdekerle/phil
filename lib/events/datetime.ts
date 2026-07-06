import type { Locale as DateFnsLocale } from "date-fns";
import { fr } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import type { TripEvent } from "./types";

/**
 * Formate un instant UTC dans un fuseau IANA donné (helper central, PHIL-F09).
 * Tout affichage d'horaire dans l'UI doit passer par ici.
 */
export function formatInTimezone(utcIso: string, timezone: string, fmt: string): string {
  return formatInTimeZone(utcIso, timezone, fmt, { locale: fr });
}

/** Heure locale de l'événement, ex : "18h00". */
export function eventTime(utcIso: string, timezone: string): string {
  return formatInTimezone(utcIso, timezone, "HH'h'mm");
}

/** Clé de jour (yyyy-MM-dd) dans le fuseau de l'événement. */
export function eventDayKey(utcIso: string, timezone: string): string {
  return formatInTimeZone(utcIso, timezone, "yyyy-MM-dd");
}

export type EventsByDay = { dayKey: string; label: string; events: TripEvent[] }[];

/**
 * Groupe les événements par jour local (fuseau de chaque événement),
 * dans l'ordre chronologique.
 */
export function groupEventsByDay(events: TripEvent[], locale: DateFnsLocale = fr): EventsByDay {
  const groups = new Map<string, TripEvent[]>();
  for (const event of events) {
    const key = eventDayKey(event.starts_at, event.timezone);
    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, dayEvents]) => ({
      dayKey,
      label: formatInTimeZone(`${dayKey}T12:00:00Z`, "UTC", "EEEE d MMMM yyyy", { locale }),
      events: dayEvents,
    }));
}
