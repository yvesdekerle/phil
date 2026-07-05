"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/provider";
import { cn } from "@/lib/utils";

export type ClockEntry = { timezone: string; label: string; isHome?: boolean };

/**
 * Horloges monde (PHIL-Q24, refonte page transversale PHIL-Q29) —
 * une horloge par ligne, triées par décalage sur Greenwich croissant.
 */
export function WorldClocks({ clocks }: { clocks: ClockEntry[] }) {
  const t = useT();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <p className="text-sm text-encre-douce">{t("clocksExtra.winding")}</p>;
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
  const dayIn = (tz: string) => {
    const day = new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: tz }).format(now);
    // Seul le jour prend une majuscule (pas "Par Rapport À Chez Toi")
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

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
                {c.isHome ? (
                  <span className="text-encre-douce"> {t("clocks.homeSuffix")}</span>
                ) : null}
              </span>
              <span className="block text-xs text-encre-douce">
                {dayIn(c.timezone)} · UTC{c.offset >= 0 ? "+" : ""}
                {c.offset}
                {!c.isHome && diff !== 0
                  ? ` · ${diff > 0 ? "+" : ""}${diff} h ${t("clocks.diff")}`
                  : ""}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
