import Link from "next/link";
import { CoverImage } from "@/components/trips/cover-image";
import { getDateFnsLocale, getT } from "@/lib/i18n/server";
import { formatDateRange } from "@/lib/trips/format";
import { type Trip, tripStatus } from "@/lib/trips/status";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  en_cours: "bg-bordeaux text-papier",
  a_venir: "bg-laiton text-papier",
  passe: "bg-encre-douce/15 text-encre-douce",
  archive: "bg-encre-douce/15 text-encre-douce",
};

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
  const isPast = status === "passe" || status === "archive";
  const t = await getT();
  const dfLocale = await getDateFnsLocale();

  return (
    <Link
      href={`/trips/${trip.id}`}
      className={cn(
        "group block overflow-hidden rounded-lg border border-laiton-clair bg-papier shadow-[0_2px_12px_rgba(31,42,68,0.06)] transition-shadow hover:shadow-[0_4px_20px_rgba(31,42,68,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laiton",
        isPast && "opacity-75",
      )}
    >
      <div className="relative h-36 overflow-hidden bg-encre">
        {trip.cover_image_url ? (
          <CoverImage
            src={trip.cover_image_url}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            fallbackChar={trip.destination.charAt(0).toUpperCase()}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-display text-4xl text-laiton italic">
              {trip.destination.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <span
          className={cn(
            "absolute top-3 right-3 rounded-full px-2.5 py-0.5 text-xs font-medium",
            STATUS_STYLES[status],
          )}
        >
          {t(`trips.status.${status}`)}
        </span>
        {pendingCount > 0 ? (
          <span
            role="img"
            className="absolute top-3 left-3 flex min-w-5 items-center justify-center rounded-full bg-bordeaux px-1.5 py-0.5 text-xs font-semibold text-papier shadow-sm"
            aria-label={t("pending.tripAria").replace("{n}", String(pendingCount))}
            title={t("pending.tripAria").replace("{n}", String(pendingCount))}
          >
            {pendingCount}
          </span>
        ) : null}
      </div>

      <div className="px-4 py-3.5">
        <h2 className="font-display text-xl text-encre">{trip.name}</h2>
        <p className="mt-0.5 text-sm text-encre-douce">{trip.destination}</p>
        <div className="mt-2.5 flex items-center justify-between text-xs text-encre-douce">
          <span>{formatDateRange(trip.start_date, trip.end_date, dfLocale)}</span>
          <span>
            {participantCount} {participantCount > 1 ? t("trips.travelers") : t("trips.traveler")}
          </span>
        </div>
      </div>
    </Link>
  );
}
