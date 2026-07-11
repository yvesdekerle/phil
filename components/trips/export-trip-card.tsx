"use client";

import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";

/**
 * Carte « Exporter ce voyage » (PHIL-Q19) dans les réglages — télécharge le
 * squelette JSON du voyage via la route `/api/trips/[tripId]/export`.
 */
export function ExportTripCard({ tripId }: { tripId: string }) {
  const t = useT();
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-line bg-card px-5 py-4">
      <h2 className="text-sm font-medium text-ink">{t("trips.export.title")}</h2>
      <p className="text-xs text-slate">{t("trips.export.description")}</p>
      <Button asChild variant="outline" size="sm" className="mt-1 self-start">
        {/* Lien natif : le nom de fichier est fixé par le Content-Disposition serveur */}
        <a href={`/api/trips/${tripId}/export`} download>
          {t("trips.export.button")}
        </a>
      </Button>
    </section>
  );
}
