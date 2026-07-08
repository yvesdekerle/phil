"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { useT } from "@/components/i18n/provider";
import { palette } from "@/lib/ui/colors";
import { cn } from "@/lib/utils";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  href?: string;
  color: string; // couleur du pion (type d'événement / idée)
  order?: number; // ordre chronologique pour le tracé
  /** Numéro affiché dans la pastille (ordre du jour, façon Polarsteps). */
  label?: string;
  /** Pastille maison (hébergements). */
  house?: boolean;
  /** Pastille photo ronde (vignette). */
  thumbUrl?: string;
  /** PHIL-S02 : exclu du tracé d'itinéraire (commerces repérés). */
  noPath?: boolean;
};

/** Carte Leaflet + OSM (PHIL-N01, style Polarsteps PHIL-Q15). */
export function TripMap({
  markers,
  drawPath,
  distanceFrom,
  focusId,
  focusNonce,
  heightClass = "h-[28rem]",
}: {
  markers: MapMarker[];
  drawPath?: boolean;
  distanceFrom?: { lat: number; lng: number; label: string } | null;
  /** Centre la carte et ouvre le popup de ce marqueur (PHIL-Q14). */
  focusId?: string | null;
  /** Change à chaque clic pour re-zoomer même sur le même lieu (PHIL-Q37c). */
  focusNonce?: number;
  /** Hauteur de la carte (PHIL-Q37b) — la page carte l'agrandit en colonne. */
  heightClass?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const t = useT();

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const map = L.map(containerRef.current, { scrollWheelZoom: true });
    mapRef.current = map;
    // Fond CARTO Voyager (PHIL-Q37c) : lisible et épuré, sans le fouillis des
    // frontières administratives d'OSM.
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);
    // La colonne carte est haute/responsive/sticky : recalcule la taille des
    // tuiles quand le conteneur change de dimensions (évite les tuiles grises),
    // et une fois après le premier paint (init en grille/flex à largeur tardive).
    // `removed` : la carte peut être démontée (navigation) avant que le rAF ou
    // le ResizeObserver ne s'exécute — invalidateSize planterait alors.
    let removed = false;
    const resize = () => {
      if (!removed) {
        map.invalidateSize();
      }
    };
    const raf = requestAnimationFrame(resize);
    const observer = new ResizeObserver(resize);
    observer.observe(containerRef.current);
    return () => {
      removed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const layer = L.layerGroup().addTo(map);
    const byId = new Map<string, L.Marker>();

    const sorted = [...markers].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Tracé façon Polarsteps : liseré clair sous un trait plein arrondi
    if (drawPath && sorted.length > 1) {
      const pathMarkers = sorted.filter((m) => !m.thumbUrl && !m.noPath);
      const points = pathMarkers.map((m) => [m.lat, m.lng] as [number, number]);
      if (points.length > 1) {
        L.polyline(points, {
          color: palette.papier,
          weight: 7,
          opacity: 0.9,
          lineJoin: "round",
          lineCap: "round",
        }).addTo(layer);
        L.polyline(points, {
          color: palette.bordeaux,
          weight: 3.5,
          opacity: 0.9,
          lineJoin: "round",
          lineCap: "round",
        }).addTo(layer);
      }
    }

    for (const m of sorted) {
      // Pastille ronde (numéro / maison / vignette photo), bord clair + ombre.
      // Le marqueur sélectionné (popup ouvert) reçoit un anneau bordeaux (PHIL-Q37c).
      const size = m.thumbUrl ? 44 : m.house ? 28 : 26;
      const iconHtml = (highlighted: boolean) => {
        const shadow = highlighted
          ? `box-shadow:0 0 0 3px ${palette.bordeaux},0 3px 12px rgba(31,42,68,.5);`
          : "box-shadow:0 2px 8px rgba(31,42,68,.45);";
        const base = `border-radius:9999px;border:2.5px solid ${palette.papier};${shadow}display:flex;align-items:center;justify-content:center;`;
        return m.thumbUrl
          ? `<div style="${base}width:44px;height:44px;background:${palette.papier} url('${m.thumbUrl}') center/cover"></div>`
          : m.house
            ? `<div style="${base}width:28px;height:28px;background:${m.color};color:${palette.papier}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg></div>`
            : `<div style="${base}width:26px;height:26px;background:${m.color};color:${palette.papier};font:700 12px/1 system-ui">${m.label ? escapeHtml(m.label) : ""}</div>`;
      };
      const makeIcon = (highlighted: boolean) =>
        L.divIcon({
          className: "",
          html: iconHtml(highlighted),
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      const icon = makeIcon(false);
      const distance =
        distanceFrom && (m.lat !== distanceFrom.lat || m.lng !== distanceFrom.lng)
          ? `<br/><span style="color:${palette.encreDouce}">${haversineKm(distanceFrom, m).toFixed(1)} km ${t("map.from")} ${escapeHtml(distanceFrom.label)}</span>`
          : "";
      const link = m.href
        ? `<br/><a href="${m.href}" style="color:${palette.bordeaux}">${t("map.viewDetails")}</a>`
        : "";
      const marker = L.marker([m.lat, m.lng], { icon })
        .bindPopup(
          `<strong>${escapeHtml(m.title)}</strong>${m.subtitle ? `<br/>${escapeHtml(m.subtitle)}` : ""}${distance}${link}`,
        )
        .addTo(layer);
      // Surbrillance du marqueur pendant que son popup est ouvert.
      marker.on("popupopen", () => marker.setIcon(makeIcon(true)));
      marker.on("popupclose", () => marker.setIcon(icon));
      byId.set(m.id, marker);
    }

    if (sorted.length > 0) {
      map.fitBounds(L.latLngBounds(sorted.map((m) => [m.lat, m.lng])), {
        padding: [36, 36],
        maxZoom: 13,
      });
    } else {
      map.setView([0, 0], 2);
    }

    // PHIL-Q14/Q37c : focus depuis la grille photos ou un clic dans la liste
    void focusNonce; // dépendance : force le re-zoom même sur le même lieu
    if (focusId) {
      const target = byId.get(focusId);
      const m = markers.find((x) => x.id === focusId);
      if (target && m) {
        map.setView([m.lat, m.lng], Math.max(map.getZoom(), 12));
        target.openPopup();
      }
    }

    return () => {
      layer.remove();
    };
  }, [markers, drawPath, distanceFrom, focusId, focusNonce, t]);

  return (
    <div
      ref={containerRef}
      className={cn(heightClass, "w-full overflow-hidden rounded-lg border border-laiton-clair")}
    />
  );
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
