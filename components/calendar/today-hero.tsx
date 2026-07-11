"use client";

import { Navigation } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EventTypeIcon } from "@/components/calendar/event-type-icon";
import { useT } from "@/components/i18n/provider";

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
  weather,
  travelToNext,
  navigateToNext,
}: {
  tripId: string;
  current: HeroEvent | null;
  next: HeroEvent | null;
  dayKey: string;
  /** Ligne météo du jour (PHIL-O02), rendue côté serveur. */
  weather?: React.ReactNode;
  /** "≈ 35 min de route" entre l'événement en cours et le prochain (PHIL-P05). */
  travelToNext?: string | null;
  /** Lien Google Maps vers le prochain RDV (PHIL-Q13). */
  navigateToNext?: string | null;
}) {
  const t = useT();
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!next) {
      return;
    }
    const inWord = t("calendar.countdown.in");
    const dayUnit = t("calendar.countdown.dayUnit");
    const hourUnit = t("calendar.countdown.hourUnit");
    const minUnit = t("calendar.countdown.minUnit");
    const tick = () => {
      const ms = new Date(next.startsAt).getTime() - Date.now();
      if (ms <= 0) {
        setCountdown(t("calendar.countdown.now"));
        return;
      }
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      setCountdown(
        h > 24
          ? `${inWord} ${Math.floor(h / 24)} ${dayUnit} ${h % 24} ${hourUnit}`
          : h > 0
            ? `${inWord} ${h} ${hourUnit} ${String(m).padStart(2, "0")}`
            : `${inWord} ${m} ${minUnit}`,
      );
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [next, t]);

  if (!current && !next) {
    return null;
  }

  return (
    <section className="rounded-lg border border-lagoon-ink/30 bg-gradient-to-br from-card to-sand px-5 py-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="flex items-center gap-3">
          <h2 className="font-sans text-lg text-ink italic">{t("calendar.today")}</h2>
          {weather}
        </span>
        <Link
          href={`/trips/${tripId}/day/${dayKey}`}
          className="text-xs text-slate underline underline-offset-4 hover:text-ink"
        >
          {t("calendar.todayHero.hourByHour")}
        </Link>
      </div>
      <div className="flex flex-col gap-2.5">
        {current ? (
          <Link
            href={`/trips/${tripId}/events/${current.id}`}
            className="flex items-center gap-3 rounded-md border border-lagoon-ink/40 bg-lagoon-ink/5 px-3 py-2.5"
          >
            <EventTypeIcon type={current.type} className="size-8" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-lagoon-ink uppercase">
                {t("calendar.todayHero.now")}
              </span>
              <span className="block truncate text-sm font-medium text-ink">{current.title}</span>
              {current.location ? (
                <span className="block truncate text-xs text-slate">{current.location}</span>
              ) : null}
            </span>
          </Link>
        ) : null}
        {next ? (
          <div className="flex items-center gap-3 rounded-md border border-line bg-card px-3 py-2.5">
            <Link
              href={`/trips/${tripId}/events/${next.id}`}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <EventTypeIcon type={next.type} className="size-8" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-mist uppercase">
                  {t("calendar.todayHero.nextDeparture")} {countdown ? `— ${countdown}` : ""}
                </span>
                <span className="block truncate text-sm font-medium text-ink">
                  {next.time} · {next.title}
                </span>
                {next.location ? (
                  <span className="block truncate text-xs text-slate">
                    {t("calendar.todayHero.meetPrefix")}
                    {next.location}
                    {travelToNext ? ` · ${travelToNext}` : ""}
                  </span>
                ) : travelToNext ? (
                  <span className="block text-xs text-slate">{travelToNext}</span>
                ) : null}
              </span>
            </Link>
            {navigateToNext ? (
              <a
                href={navigateToNext}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-lagoon-ink/40 bg-lagoon-ink/5 px-3 py-1.5 text-xs font-medium text-lagoon-ink transition-colors hover:bg-lagoon-ink hover:text-card"
                aria-label={t("calendar.todayHero.goAria")}
              >
                <Navigation className="size-3.5" aria-hidden="true" /> {t("calendar.todayHero.go")}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
