import { differenceInCalendarDays } from "date-fns";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CoverImage } from "@/components/trips/cover-image";
import { getDateFnsLocale, getT } from "@/lib/i18n/server";
import { formatDateRange } from "@/lib/trips/format";
import { type Trip, tripStatus } from "@/lib/trips/status";
import { cn } from "@/lib/utils";

/**
 * Carte de la liste des voyages (prototype « Mes voyages ») : carte héro
 * (r-20, ombre float sans bordure, badge mono sur la photo, pied « Ouvrir le
 * voyage »). Nouveauté = point berry, jamais de compteur.
 * V07c : les voyages passés gardent le même format mais en grisé — photo
 * désaturée (la couleur revient au survol), textes éteints, bordure au lieu
 * de l'ombre.
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
  past = false,
}: {
  trip: Trip;
  participantCount: number;
  pendingCount?: number;
  /** Voyage passé/archivé : même carte, livrée grisée. */
  past?: boolean;
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
      className={cn(
        "group block overflow-hidden rounded-xl bg-card transition-all outline-none hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand",
        past ? "border border-line" : "shadow-float",
      )}
    >
      <div
        className={cn(
          "relative h-44 overflow-hidden bg-gradient-to-br from-lagoon to-lagoon-ink",
          past && "grayscale transition-[filter] duration-500 group-hover:grayscale-0",
        )}
      >
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
        <h2
          className={cn("text-xl font-extrabold tracking-tight", past ? "text-slate" : "text-ink")}
        >
          {trip.name}
        </h2>
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className={cn(
              "font-mono text-data uppercase tabular-nums",
              past ? "text-mist" : "text-slate",
            )}
          >
            {formatDateRange(trip.start_date, trip.end_date, dfLocale)}
          </span>
          <span aria-hidden="true" className="size-[3px] rounded-full bg-ghost" />
          <span
            className={cn(
              "font-mono text-data uppercase tabular-nums",
              past ? "text-mist" : "text-slate",
            )}
          >
            {t("trips.onboard").replace("{n}", String(participantCount))}
          </span>
        </div>
        <div className="mt-3.5 flex items-center justify-between border-t border-wash pt-3.5">
          <span className={cn("text-body font-semibold", past ? "text-slate" : "text-lagoon-ink")}>
            {t("trips.open")}
          </span>
          <ArrowRight
            aria-hidden="true"
            className={cn("size-4.5", past ? "text-slate" : "text-lagoon-ink")}
          />
        </div>
      </div>
    </Link>
  );
}
