"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * Bascule Calendrier ⇄ Timeline (PHIL-Q36) — mémorise le choix dans un cookie
 * lu côté serveur, pour retrouver sa vue préférée en rouvrant un voyage.
 */
export function TripViewToggle({
  tripId,
  active,
}: {
  tripId: string;
  active: "calendar" | "timeline";
}) {
  const router = useRouter();
  const t = useT();

  const go = (view: "calendar" | "timeline") => {
    if (view === active) {
      return;
    }
    // 1 an, lisible par le serveur pour atterrir sur la bonne vue. document.cookie
    // (et non la CookieStore API, async et peu supportée) : simple pref non sensible.
    // biome-ignore lint/suspicious/noDocumentCookie: préférence d'affichage, pas de donnée sensible
    document.cookie = `phil_trip_view=${view}; path=/; max-age=31536000; samesite=lax`;
    router.push(view === "timeline" ? `/trips/${tripId}/timeline` : `/trips/${tripId}`);
  };

  const seg = (view: "calendar" | "timeline", label: string) => (
    <button
      type="button"
      onClick={() => go(view)}
      aria-pressed={active === view}
      className={cn(
        "rounded-full px-3 py-1 text-sm transition-colors",
        active === view
          ? "bg-bordeaux font-medium text-papier"
          : "text-encre-douce hover:text-encre",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-laiton-clair bg-papier p-0.5">
      {seg("calendar", t("calendar.viewToggle.calendar"))}
      {seg("timeline", t("calendar.viewToggle.timeline"))}
    </div>
  );
}
