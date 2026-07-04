"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ClockEntry = { timezone: string; label: string; isHome?: boolean };

/**
 * Horloges monde (PHIL-Q24, refonte page transversale PHIL-Q29) —
 * une horloge par ligne, triées par décalage sur Greenwich croissant.
 */
export function WorldClocks({ clocks }: { clocks: ClockEntry[] }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <p className="text-sm text-encre-douce">Phil remonte ses montres…</p>;
  }

  // Décalage UTC en heures (au quart d'heure près)
  const offsetOf = (tz: string) => {
    const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    const utc = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    return Math.round(((local.getTime() - utc.getTime()) / 3_600_000) * 4) / 4;
  };
  const timeIn = (tz: string) =>
    new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(
      now,
    );
  const dayIn = (tz: string) =>
    new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: tz }).format(now);

  const sorted = clocks
    .map((c) => ({ ...c, offset: offsetOf(c.timezone) }))
    .sort((a, b) => a.offset - b.offset || a.label.localeCompare(b.label, "fr"));
  const homeOffset = sorted.find((c) => c.isHome)?.offset ?? 0;

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((c) => {
        const diff = c.offset - homeOffset;
        return (
          <li
            key={`${c.timezone}-${c.label}`}
            className={cn(
              "flex items-baseline gap-4 rounded-lg border bg-papier px-5 py-3",
              c.isHome ? "border-laiton" : "border-laiton-clair",
            )}
          >
            <span className="font-display text-3xl text-encre tabular-nums">
              {timeIn(c.timezone)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-encre">
                {c.label}
                {c.isHome ? <span className="text-encre-douce"> — chez toi</span> : null}
              </span>
              <span className="block text-xs text-encre-douce capitalize">
                {dayIn(c.timezone)} · UTC{c.offset >= 0 ? "+" : ""}
                {c.offset}
                {!c.isHome && diff !== 0
                  ? ` · ${diff > 0 ? "+" : ""}${diff} h par rapport à chez toi`
                  : ""}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
