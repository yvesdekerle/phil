/**
 * Temps de trajet (PHIL-P05) — OSRM public (projet OpenStreetMap, gratuit,
 * usage léger). Profil voiture en v1. Best-effort : pas de coordonnées ou
 * échec réseau → null, jamais bloquant. Cache Next 24 h par paire.
 */

export type Point = { lat: number; lng: number };

export async function getTravelMinutes(from: Point, to: Point): Promise<number | null> {
  const coords = `${from.lng.toFixed(5)},${from.lat.toFixed(5)};${to.lng.toFixed(5)},${to.lat.toFixed(5)}`;
  try {
    const r = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`,
      { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(3000) },
    );
    if (!r.ok) {
      return null;
    }
    const json = (await r.json()) as { code?: string; routes?: { duration: number }[] };
    const seconds = json.code === "Ok" ? json.routes?.[0]?.duration : undefined;
    return seconds !== undefined ? Math.round(seconds / 60) : null;
  } catch {
    return null;
  }
}

/** "≈ 1 h 05" / "≈ 35 min" */
export function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `≈ ${h} h ${String(m).padStart(2, "0")}` : `≈ ${h} h`;
  }
  return `≈ ${minutes} min`;
}
