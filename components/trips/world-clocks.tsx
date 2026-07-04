"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Horloges du voyage (PHIL-Q24) — l'heure de chez soi et l'heure de la
 * destination côte à côte, comme les horloges monde d'un téléphone.
 */
export function WorldClocks({
  homeTimezone,
  homeLabel,
  tripTimezone,
  tripLabel,
}: {
  homeTimezone: string;
  homeLabel: string;
  tripTimezone: string;
  tripLabel: string;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  if (!now || homeTimezone === tripTimezone) {
    return null;
  }

  const timeIn = (tz: string) =>
    new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    }).format(now);

  // Décalage en heures entre les deux fuseaux (au quart d'heure près)
  const offsetOf = (tz: string) => {
    const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    return Math.round(((local.getTime() - now.getTime()) / 3_600_000) * 4) / 4;
  };
  const diff = offsetOf(tripTimezone) - offsetOf(homeTimezone);
  const diffLabel = diff === 0 ? "" : ` (${diff > 0 ? "+" : ""}${diff} h)`;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-laiton-clair bg-papier px-4 py-2 text-sm">
      <Clock className="size-4 shrink-0 text-laiton" aria-hidden="true" />
      <span className="text-encre">
        <span className="font-medium tabular-nums">{timeIn(homeTimezone)}</span>{" "}
        <span className="text-encre-douce">{homeLabel}</span>
      </span>
      <span className="text-encre">
        <span className="font-medium tabular-nums">{timeIn(tripTimezone)}</span>{" "}
        <span className="text-encre-douce">
          {tripLabel}
          {diffLabel}
        </span>
      </span>
    </div>
  );
}
