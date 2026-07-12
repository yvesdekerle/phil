"use client";

import { useEffect, useState } from "react";
import { useLocale, useT } from "@/components/i18n/provider";
import { intlLocale } from "@/lib/i18n/dates";
import { cn } from "@/lib/utils";

export type ClockEntry = { timezone: string; label: string; isHome?: boolean };

/**
 * Horloges monde (PHIL-Q24, refonte page transversale PHIL-Q29) —
 * une horloge par ligne, triées par décalage sur Greenwich croissant.
 */
export function WorldClocks({ clocks }: { clocks: ClockEntry[] }) {
  const t = useT();
  const il = intlLocale(useLocale());
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <p className="text-sm text-slate">{t("clocksExtra.winding")}</p>;
  }

  // Décalage UTC en heures (au quart d'heure près)
  const offsetOf = (tz: string) => {
    const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    const utc = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    return Math.round(((local.getTime() - utc.getTime()) / 3_600_000) * 4) / 4;
  };
  const timeIn = (tz: string) =>
    new Intl.DateTimeFormat(il, { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(now);
  const dayIn = (tz: string) => {
    const day = new Intl.DateTimeFormat(il, { weekday: "long", timeZone: tz }).format(now);
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
              "flex items-baseline gap-4 rounded-lg border bg-card px-5 py-3",
              c.isHome ? "border-line" : "border-line",
            )}
          >
            <span className="font-sans text-3xl text-ink tabular-nums">{timeIn(c.timezone)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">
                {c.label}
                {c.isHome ? <span className="text-slate"> {t("clocks.homeSuffix")}</span> : null}
              </span>
              <span className="block text-xs text-slate">
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
