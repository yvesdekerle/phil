"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  href?: string;
  color: string; // couleur du pion (type d'événement / idée)
  order?: number; // ordre chronologique pour le tracé
};

/** Carte Leaflet + OSM (PHIL-N01). Pions colorés, tracé chronologique optionnel. */
export function TripMap({
  markers,
  drawPath,
  distanceFrom,
}: {
  markers: MapMarker[];
  drawPath?: boolean;
  distanceFrom?: { lat: number; lng: number; label: string } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const map = L.map(containerRef.current, { scrollWheelZoom: true });
    mapRef.current = map;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    return () => {
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

    const sorted = [...markers].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const m of sorted) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:22px;height:22px;border-radius:9999px 9999px 9999px 2px;transform:rotate(-45deg);background:${m.color};border:2px solid #fbf8f1;box-shadow:0 1px 6px rgba(31,42,68,.4)"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 20],
      });
      const distance =
        distanceFrom && (m.lat !== distanceFrom.lat || m.lng !== distanceFrom.lng)
          ? `<br/><span style="color:#5a6379">${haversineKm(distanceFrom, m).toFixed(1)} km depuis ${escapeHtml(distanceFrom.label)}</span>`
          : "";
      const link = m.href
        ? `<br/><a href="${m.href}" style="color:#6e1f2e">Voir la fiche →</a>`
        : "";
      L.marker([m.lat, m.lng], { icon })
        .bindPopup(
          `<strong>${escapeHtml(m.title)}</strong>${m.subtitle ? `<br/>${escapeHtml(m.subtitle)}` : ""}${distance}${link}`,
        )
        .addTo(layer);
    }

    if (drawPath && sorted.length > 1) {
      L.polyline(
        sorted.map((m) => [m.lat, m.lng]),
        { color: "#6e1f2e", weight: 2.5, opacity: 0.7, dashArray: "6 8" },
      ).addTo(layer);
    }

    if (sorted.length > 0) {
      map.fitBounds(L.latLngBounds(sorted.map((m) => [m.lat, m.lng])), {
        padding: [36, 36],
        maxZoom: 13,
      });
    } else {
      map.setView([0, 0], 2);
    }

    return () => {
      layer.remove();
    };
  }, [markers, drawPath, distanceFrom]);

  return (
    <div
      ref={containerRef}
      className="h-[28rem] w-full overflow-hidden rounded-lg border border-laiton-clair"
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
