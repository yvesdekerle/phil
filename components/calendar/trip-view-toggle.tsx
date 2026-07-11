"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/provider";
import { cn } from "@/lib/utils";

type TripView = "calendar" | "timeline" | "carte";

/**
 * Bascule Calendrier / Timeline / Carte (PHIL-Q36 + carte intégrée au Journal).
 * Calendrier et Timeline mémorisent la vue d'atterrissage du voyage dans un
 * cookie lu côté serveur ; la Carte est une vue « coup d'œil », non mémorisée.
 */
export function TripViewToggle({ tripId, active }: { tripId: string; active: TripView }) {
  const router = useRouter();
  const t = useT();

  const go = (view: TripView) => {
    if (view === active) {
      return;
    }
    if (view !== "carte") {
      // 1 an, lisible par le serveur pour atterrir sur la bonne vue.
      // biome-ignore lint/suspicious/noDocumentCookie: préférence d'affichage, pas de donnée sensible
      document.cookie = `phil_trip_view=${view}; path=/; max-age=31536000; samesite=lax`;
    }
    const path =
      view === "timeline"
        ? `/trips/${tripId}/timeline`
        : view === "carte"
          ? `/trips/${tripId}/map`
          : `/trips/${tripId}`;
    router.push(path);
  };

  const seg = (view: TripView, label: string) => (
    <button
      type="button"
      onClick={() => go(view)}
      aria-pressed={active === view}
      className={cn(
        "rounded-full px-3 py-1 text-sm transition-colors",
        active === view ? "bg-lagoon-ink font-medium text-card" : "text-slate hover:text-ink",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="inline-flex w-fit items-center gap-0.5 rounded-full border border-line bg-card p-0.5">
      {seg("calendar", t("calendar.viewToggle.calendar"))}
      {seg("timeline", t("calendar.viewToggle.timeline"))}
      {seg("carte", t("calendar.viewToggle.map"))}
    </div>
  );
}
