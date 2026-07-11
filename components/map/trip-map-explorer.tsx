"use client";

import { Home } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { EventTypeIcon } from "@/components/calendar/event-type-icon";
import { useT } from "@/components/i18n/provider";
import type { MapMarker } from "@/components/map/trip-map";
import { TripMapLazy } from "@/components/map/trip-map-lazy";
import { Switch } from "@/components/ui/switch";
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
  filter,
}: {
  markers: MapMarker[];
  departureId: string | null;
  dayRows: DayRow[] | null;
  heading: string;
  drawPath: boolean;
  distanceFrom: { lat: number; lng: number; label: string } | null;
  distanceLabel: string | null;
  missing: number;
  /** Le menu déroulant « filtrer par jour » (rendu côté serveur). */
  filter?: ReactNode;
}) {
  const t = useT();
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [showDeparture, setShowDeparture] = useState(false);

  const focus = (id: string) => {
    setFocusId(id);
    setFocusNonce((n) => n + 1);
  };

  // Identité stable (V06d) : un clic de focus re-rend le composant, et une
  // liste recréée forcerait TripMap à reconstruire tous ses marqueurs en
  // pleine animation de zoom — c'est ce qui les éparpillait.
  const shownMarkers = useMemo(
    () => (showDeparture || !departureId ? markers : markers.filter((m) => m.id !== departureId)),
    [markers, showDeparture, departureId],
  );
  const count = shownMarkers.length;

  const pin = (m: MapMarker) => (
    <span
      className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-card"
      style={{ backgroundColor: m.color }}
    >
      {m.house ? <Home className="size-3.5" aria-hidden="true" /> : (m.label ?? "")}
    </span>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Ligne du haut : filtre par jour à gauche, toggle départ/arrivée à droite */}
      {filter || departureId ? (
        <div className="flex flex-wrap items-center gap-3">
          {filter}
          {departureId ? (
            <label
              htmlFor="map-show-departure"
              className="ml-auto flex cursor-pointer items-center gap-2.5"
            >
              <span className="text-sm text-slate">{t("map.departureLabel")}</span>
              <Switch
                id="map-show-departure"
                checked={showDeparture}
                onCheckedChange={(v) => {
                  setShowDeparture(v);
                  setFocusId(null);
                }}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,24rem)_1fr] lg:items-start">
        <div className="order-2 flex flex-col gap-3 lg:order-1 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
          <section className="rounded-lg border border-line bg-card px-4 py-3">
            <h2 className="mb-2 text-sm font-medium text-ink">{heading}</h2>
            {dayRows ? (
              <ol className="flex flex-col">
                {dayRows.map((r, i) => (
                  <li key={r.id}>
                    {r.legText ? (
                      <p className="my-1 ml-3.5 border-l-2 border-dashed border-line py-0.5 pl-4 text-xs text-slate">
                        {r.legText}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => focus(r.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-1 py-1 text-left transition-colors hover:bg-citron/10",
                        focusId === r.id && "bg-citron/15",
                      )}
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-lagoon-ink text-xs font-bold text-card">
                        {i + 1}
                      </span>
                      <EventTypeIcon type={r.type} className="size-6 shrink-0" />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">{r.title}</span>
                      <span className="shrink-0 text-xs text-slate tabular-nums">{r.time}</span>
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
                        "flex w-full items-center gap-2.5 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-citron/10",
                        focusId === m.id && "bg-citron/15",
                      )}
                    >
                      {pin(m)}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{m.title}</span>
                        {m.subtitle ? (
                          <span className="block truncate text-xs text-slate">{m.subtitle}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate">{t("map.noPlaces")}</p>
            )}
          </section>

          <p className="px-1 text-xs text-slate">
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
    </div>
  );
}
