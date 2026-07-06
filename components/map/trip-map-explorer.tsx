"use client";

import { Home } from "lucide-react";
import { useState } from "react";
import { EventTypeIcon } from "@/components/calendar/event-type-icon";
import { useT } from "@/components/i18n/provider";
import type { MapMarker } from "@/components/map/trip-map";
import { TripMapLazy } from "@/components/map/trip-map-lazy";
import { cn } from "@/lib/utils";

export type DayRow = {
  id: string;
  title: string;
  time: string;
  type: "TRANSPORT" | "LODGING" | "ACTIVITY";
  /** Ligne de trajet pré-formatée (« ↓ 3.7 km · ≈ 16 min de route »), ou null. */
  legText: string | null;
};

/**
 * Carte + liste (PHIL-Q37c) — cliquer un lieu recentre/zoome la carte, et un
 * toggle affiche ou masque le point de départ/arrivée (masqué par défaut : la
 * France éloignée fausse le cadrage du voyage).
 */
export function TripMapExplorer({
  markers,
  departureId,
  dayRows,
  heading,
  drawPath,
  distanceFrom,
  distanceLabel,
  missing,
}: {
  markers: MapMarker[];
  departureId: string | null;
  dayRows: DayRow[] | null;
  heading: string;
  drawPath: boolean;
  distanceFrom: { lat: number; lng: number; label: string } | null;
  distanceLabel: string | null;
  missing: number;
}) {
  const t = useT();
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [showDeparture, setShowDeparture] = useState(false);

  const focus = (id: string) => {
    setFocusId(id);
    setFocusNonce((n) => n + 1);
  };

  const shownMarkers =
    showDeparture || !departureId ? markers : markers.filter((m) => m.id !== departureId);
  const count = shownMarkers.length;

  const pin = (m: MapMarker) => (
    <span
      className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-papier"
      style={{ backgroundColor: m.color }}
    >
      {m.house ? <Home className="size-3.5" aria-hidden="true" /> : (m.label ?? "")}
    </span>
  );

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,24rem)_1fr] lg:items-start">
      <div className="order-2 flex flex-col gap-3 lg:order-1 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
        {departureId ? (
          <button
            type="button"
            onClick={() => {
              setShowDeparture((v) => !v);
              setFocusId(null);
            }}
            className="self-start rounded-full border border-laiton-clair bg-papier px-3 py-1 text-xs font-medium text-encre-douce transition-colors hover:border-laiton hover:text-encre"
          >
            {showDeparture ? t("map.hideDeparture") : t("map.showDeparture")}
          </button>
        ) : null}

        <section className="rounded-lg border border-laiton-clair bg-papier px-4 py-3">
          <h2 className="mb-2 text-sm font-medium text-encre">{heading}</h2>
          {dayRows ? (
            <ol className="flex flex-col">
              {dayRows.map((r, i) => (
                <li key={r.id}>
                  {r.legText ? (
                    <p className="my-1 ml-3.5 border-l-2 border-dashed border-laiton-clair py-0.5 pl-4 text-xs text-encre-douce">
                      {r.legText}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => focus(r.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-1 py-1 text-left transition-colors hover:bg-laiton/10",
                      focusId === r.id && "bg-laiton/15",
                    )}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-bordeaux text-xs font-bold text-papier">
                      {i + 1}
                    </span>
                    <EventTypeIcon type={r.type} className="size-6 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm text-encre">{r.title}</span>
                    <span className="shrink-0 text-xs text-encre-douce tabular-nums">{r.time}</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : count > 0 ? (
            <ul className="flex flex-col gap-0.5">
              {shownMarkers.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => focus(m.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-laiton/10",
                      focusId === m.id && "bg-laiton/15",
                    )}
                  >
                    {pin(m)}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-encre">{m.title}</span>
                      {m.subtitle ? (
                        <span className="block truncate text-xs text-encre-douce">
                          {m.subtitle}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-encre-douce">{t("map.noPlaces")}</p>
          )}
        </section>

        <p className="px-1 text-xs text-encre-douce">
          {count} {count > 1 ? t("map.places") : t("map.place")} {t("map.onMap")}
          {missing > 0 ? ` · ${missing} ${t("map.missingNote")}` : ""}
          {distanceLabel ? ` · ${t("map.distancesFrom")} ${distanceLabel}` : ""}
        </p>
      </div>

      <div className="order-1 lg:order-2 lg:sticky lg:top-4">
        <TripMapLazy
          markers={shownMarkers}
          drawPath={drawPath}
          distanceFrom={distanceFrom}
          focusId={focusId}
          focusNonce={focusNonce}
          heightClass="h-[55vh] lg:h-[calc(100vh-7rem)]"
        />
      </div>
    </div>
  );
}
