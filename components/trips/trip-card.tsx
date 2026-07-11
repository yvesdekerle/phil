import { differenceInCalendarDays } from "date-fns";
import { ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import { CoverImage } from "@/components/trips/cover-image";
import { getDateFnsLocale, getT } from "@/lib/i18n/server";
import { formatDateRange } from "@/lib/trips/format";
import { type Trip, tripStatus } from "@/lib/trips/status";

/**
 * Cartes de la liste des voyages (prototype « Mes voyages ») :
 * `TripCard` — carte héro plein largeur pour les voyages en cours / à venir
 * (r-20, ombre float sans bordure, badge mono sur la photo, pied « Ouvrir le
 * voyage ») ; `TripPastRow` — rangée compacte pour les voyages passés
 * (vignette 44, méta mono-caps). Nouveauté = point berry, jamais de compteur.
 */

function PendingDot({ label }: { label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className="absolute top-3.5 right-4 size-2.5 rounded-full bg-berry ring-2 ring-white"
    />
  );
}

export async function TripCard({
  trip,
  participantCount,
  pendingCount = 0,
}: {
  trip: Trip;
  participantCount: number;
  pendingCount?: number;
}) {
  const status = tripStatus(trip);
  const t = await getT();
  const dfLocale = await getDateFnsLocale();

  const daysToGo = differenceInCalendarDays(new Date(trip.start_date), new Date());
  const overlay =
    status === "en_cours"
      ? t("trips.now")
      : status === "a_venir" && daysToGo >= 0
        ? t("trips.nextDeparture").replace("{n}", String(daysToGo))
        : null;

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group block overflow-hidden rounded-xl bg-card shadow-float transition-all outline-none hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
    >
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-lagoon to-lagoon-ink">
        {trip.cover_image_url ? (
          <CoverImage
            src={trip.cover_image_url}
            sizes="(max-width: 1024px) 100vw, 590px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            fallbackChar={trip.destination.charAt(0).toUpperCase()}
            fallbackClassName="text-4xl font-extrabold text-white/80"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl font-extrabold text-white/80">
              {trip.destination.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {overlay ? (
          <span className="absolute top-3.5 left-4 rounded-full bg-ink-deep/35 px-2.5 py-1 font-mono text-label tracking-widest text-white uppercase tabular-nums">
            {overlay}
          </span>
        ) : null}
        {pendingCount > 0 ? (
          <PendingDot label={t("pending.tripAria").replace("{n}", String(pendingCount))} />
        ) : null}
      </div>

      <div className="p-4">
        <h2 className="text-xl font-extrabold tracking-tight text-ink">{trip.name}</h2>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="font-mono text-data text-slate uppercase tabular-nums">
            {formatDateRange(trip.start_date, trip.end_date, dfLocale)}
          </span>
          <span aria-hidden="true" className="size-[3px] rounded-full bg-ghost" />
          <span className="font-mono text-data text-slate uppercase tabular-nums">
            {t("trips.onboard").replace("{n}", String(participantCount))}
          </span>
        </div>
        <div className="mt-3.5 flex items-center justify-between border-t border-wash pt-3.5">
          <span className="text-body font-semibold text-lagoon-ink">{t("trips.open")}</span>
          <ArrowRight aria-hidden="true" className="size-4.5 text-lagoon-ink" />
        </div>
      </div>
    </Link>
  );
}

export async function TripPastRow({
  trip,
  participantCount,
  pendingCount = 0,
}: {
  trip: Trip;
  participantCount: number;
  pendingCount?: number;
}) {
  const t = await getT();
  const dfLocale = await getDateFnsLocale();

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="relative flex items-center gap-3.5 rounded-lg border border-line bg-card px-4 py-3.5 transition-colors outline-none hover:bg-wash focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
    >
      <span className="relative block size-11 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-lagoon-soft to-lagoon-ink">
        {trip.cover_image_url ? (
          <CoverImage
            src={trip.cover_image_url}
            sizes="44px"
            className="object-cover"
            fallbackChar={trip.destination.charAt(0).toUpperCase()}
            fallbackClassName="text-sm font-extrabold text-white/80"
          />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-subhead text-ink">{trip.name}</span>
        <span className="mt-0.5 block font-mono text-caption font-semibold text-mist uppercase tabular-nums">
          {formatDateRange(trip.start_date, trip.end_date, dfLocale)} ·{" "}
          {t("trips.onboard").replace("{n}", String(participantCount))}
        </span>
      </span>
      {pendingCount > 0 ? (
        <PendingDot label={t("pending.tripAria").replace("{n}", String(pendingCount))} />
      ) : null}
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-mist" />
    </Link>
  );
}
