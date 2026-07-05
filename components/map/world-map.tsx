"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useTransition } from "react";
import { toggleVisitedCountry } from "@/app/(app)/explorer/actions";
import { useT } from "@/components/i18n/provider";

/** Palette Phil pour les pays visités — teinte stable par pays. */
const VISITED_COLORS = ["#6e1f2e", "#b08d3f", "#1f2a44", "#3f6e5a"];
const UNVISITED = "#efe6d5"; // beige parchemin : "à visiter"

function colorFor(code: string): string {
  let h = 0;
  for (const c of code) {
    h = (h * 31 + c.charCodeAt(0)) % 997;
  }
  return VISITED_COLORS[h % VISITED_COLORS.length];
}

/**
 * Carte du monde des pays visités (PHIL-P13) — GeoJSON Natural Earth embarqué,
 * pas de tuiles : fond uni, pays cliquables pour cocher/décocher.
 */
export function WorldMap({ visited }: { visited: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const visitedRef = useRef(new Set(visited));
  const [, startTransition] = useTransition();
  const t = useT();

  useEffect(() => {
    visitedRef.current = new Set(visited);
  }, [visited]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    // Le double montage StrictMode (dev) démonte l'effet avant que le fetch
    // ne résolve : sans ce garde, `.addTo(map)` s'exécute sur une carte déjà
    // détruite → « Cannot read properties of undefined (reading 'appendChild') ».
    let cancelled = false;
    const map = L.map(el, {
      zoomControl: true,
      attributionControl: false,
      minZoom: 1,
      maxZoom: 6,
      worldCopyJump: true,
    }).setView([20, 10], 2);
    el.style.background = "#f7f1e3";

    let layer: L.GeoJSON | null = null;
    fetch("/geo/countries.geojson")
      .then((r) => r.json())
      .then((geojson) => {
        if (cancelled) {
          return;
        }
        const styleOf = (code: string): L.PathOptions =>
          visitedRef.current.has(code)
            ? { fillColor: colorFor(code), fillOpacity: 0.85, color: "#f7f1e3", weight: 0.7 }
            : { fillColor: UNVISITED, fillOpacity: 1, color: "#d8c9a3", weight: 0.7 };

        layer = L.geoJSON(geojson, {
          style: (f) => styleOf(f?.properties.code ?? ""),
          onEachFeature: (feature, featureLayer) => {
            const { code, name } = feature.properties as { code: string; name: string };
            const pathLayer = featureLayer as L.Path;
            featureLayer.bindTooltip(name, { sticky: true });
            featureLayer.on("click", () => {
              const next = !visitedRef.current.has(code);
              // optimiste : couleur immédiate, l'action serveur suit
              if (next) {
                visitedRef.current.add(code);
              } else {
                visitedRef.current.delete(code);
              }
              pathLayer.setStyle(styleOf(code));
              // PHIL-Q57 : rollback si l'écriture serveur échoue
              startTransition(async () => {
                const ok = await toggleVisitedCountry(code, next);
                if (!ok) {
                  if (next) {
                    visitedRef.current.delete(code);
                  } else {
                    visitedRef.current.add(code);
                  }
                  pathLayer.setStyle(styleOf(code));
                }
              });
            });
          },
        }).addTo(map);
      })
      .catch(() => {
        // fetch annulé ou GeoJSON indisponible : la carte reste vide, pas de crash
      });

    return () => {
      cancelled = true;
      layer?.remove();
      map.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      role="application"
      className="h-[420px] w-full overflow-hidden rounded-lg border border-laiton-clair"
      aria-label={t("map.worldAria")}
    />
  );
}
