"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EventTypeIcon } from "@/components/calendar/event-type-icon";

type HeroEvent = {
  id: string;
  title: string;
  type: "TRANSPORT" | "LODGING" | "ACTIVITY";
  startsAt: string;
  time: string; // heure locale pré-formatée
  location: string | null;
};

/** Vue « Aujourd'hui » pendant le voyage (PHIL-N10) : en cours + prochain départ. */
export function TodayHero({
  tripId,
  current,
  next,
  dayKey,
}: {
  tripId: string;
  current: HeroEvent | null;
  next: HeroEvent | null;
  dayKey: string;
}) {
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!next) {
      return;
    }
    const tick = () => {
      const ms = new Date(next.startsAt).getTime() - Date.now();
      if (ms <= 0) {
        setCountdown("c'est maintenant !");
        return;
      }
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      setCountdown(
        h > 24
          ? `dans ${Math.floor(h / 24)} j ${h % 24} h`
          : h > 0
            ? `dans ${h} h ${String(m).padStart(2, "0")}`
            : `dans ${m} min`,
      );
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [next]);

  if (!current && !next) {
    return null;
  }

  return (
    <section className="rounded-lg border border-bordeaux/30 bg-gradient-to-br from-papier to-parchemin px-5 py-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-lg text-encre italic">Aujourd'hui</h2>
        <Link
          href={`/trips/${tripId}/day/${dayKey}`}
          className="text-xs text-encre-douce underline underline-offset-4 hover:text-encre"
        >
          La journée heure par heure →
        </Link>
      </div>
      <div className="flex flex-col gap-2.5">
        {current ? (
          <Link
            href={`/trips/${tripId}/events/${current.id}`}
            className="flex items-center gap-3 rounded-md border border-bordeaux/40 bg-bordeaux/5 px-3 py-2.5"
          >
            <EventTypeIcon type={current.type} className="size-8" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-bordeaux uppercase">
                En ce moment
              </span>
              <span className="block truncate text-sm font-medium text-encre">{current.title}</span>
              {current.location ? (
                <span className="block truncate text-xs text-encre-douce">{current.location}</span>
              ) : null}
            </span>
          </Link>
        ) : null}
        {next ? (
          <Link
            href={`/trips/${tripId}/events/${next.id}`}
            className="flex items-center gap-3 rounded-md border border-laiton-clair bg-papier px-3 py-2.5"
          >
            <EventTypeIcon type={next.type} className="size-8" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-laiton uppercase">
                Prochain départ {countdown ? `— ${countdown}` : ""}
              </span>
              <span className="block truncate text-sm font-medium text-encre">
                {next.time} · {next.title}
              </span>
              {next.location ? (
                <span className="block truncate text-xs text-encre-douce">
                  RDV : {next.location}
                </span>
              ) : null}
            </span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
