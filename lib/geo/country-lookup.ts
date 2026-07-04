import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Pays contenant un point (PHIL-P13) — point-dans-polygone (ray casting) sur
 * le GeoJSON Natural Earth 50m embarqué dans public/geo/. Zéro réseau :
 * sert à suggérer les pays visités depuis les destinations géocodées.
 */

type Ring = [number, number][];
type Feature = {
  properties: { code: string; name: string };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: Ring[] | Ring[][] };
};

let cache: Feature[] | null = null;

async function loadCountries(): Promise<Feature[]> {
  if (!cache) {
    const raw = await readFile(path.join(process.cwd(), "public/geo/countries.geojson"), "utf8");
    cache = (JSON.parse(raw) as { features: Feature[] }).features;
  }
  return cache;
}

function inRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function inPolygon(lng: number, lat: number, polygon: Ring[]): boolean {
  // premier anneau = extérieur, les suivants = trous
  if (!inRing(lng, lat, polygon[0])) {
    return false;
  }
  return !polygon.slice(1).some((hole) => inRing(lng, lat, hole));
}

export async function countryAt(
  lat: number,
  lng: number,
): Promise<{ code: string; name: string } | null> {
  const countries = await loadCountries();
  for (const f of countries) {
    const polys =
      f.geometry.type === "Polygon"
        ? [f.geometry.coordinates as Ring[]]
        : (f.geometry.coordinates as Ring[][]);
    if (polys.some((p) => inPolygon(lng, lat, p))) {
      return f.properties;
    }
  }
  return null;
}
