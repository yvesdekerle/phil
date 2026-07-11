"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/provider";
import { cn } from "@/lib/utils";

type TripView = "calendar" | "timeline" | "carte";

/**
 * Sous-vues du Programme (PHIL-Q36 + carte intégrée) — onglets texte soulignés
 * citron SOUS le mot (déclinaison L2a). Calendrier et Timeline mémorisent la
 * vue d'atterrissage dans un cookie lu côté serveur ; la Carte est une vue
 * « coup d'œil », non mémorisée.
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
        "relative pb-2 transition-colors outline-none after:absolute after:inset-x-0 after:bottom-0 after:h-[2.5px] after:rounded-[3px] after:bg-citron after:opacity-0 after:transition-opacity focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand",
        active === view
          ? "text-body font-bold text-ink after:opacity-100"
          : "text-ui font-normal text-mist hover:text-ink",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex w-fit items-end gap-4">
      {seg("calendar", t("calendar.viewToggle.calendar"))}
      {seg("timeline", t("calendar.viewToggle.timeline"))}
      {seg("carte", t("calendar.viewToggle.map"))}
    </div>
  );
}
