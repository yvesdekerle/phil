import { haversineKm } from "@/lib/geo/distance";

/**
 * Ordre de visite suggéré (PHIL-P10) — plus proche voisin depuis un point de
 * départ (l'hébergement du jour), pas de vrai TSP : largement suffisant pour
 * 3-6 activités. Purement indicatif, ne modifie rien.
 */

export type Stop = { id: string; title: string; lat: number; lng: number };

function pathKm(start: { lat: number; lng: number } | null, stops: Stop[]): number {
  let km = 0;
  let prev = start;
  for (const stop of stops) {
    if (prev) {
      km += haversineKm(prev, stop);
    }
    prev = stop;
  }
  return km;
}

export function suggestVisitOrder(
  stops: Stop[],
  start: { lat: number; lng: number } | null,
): { order: Stop[]; currentKm: number; suggestedKm: number } | null {
  if (stops.length < 3) {
    return null;
  }
  const remaining = [...stops];
  const order: Stop[] = [];
  let current = start ?? remaining[0];
  if (!start) {
    order.push(remaining.shift() as Stop);
  }
  while (remaining.length > 0) {
    let best = 0;
    for (let i = 1; i < remaining.length; i++) {
      if (haversineKm(current, remaining[i]) < haversineKm(current, remaining[best])) {
        best = i;
      }
    }
    const [next] = remaining.splice(best, 1);
    order.push(next);
    current = next;
  }

  const currentKm = pathKm(start, stops);
  const suggestedKm = pathKm(start, order);
  // On ne suggère que si le gain est réel (> 15 % et > 2 km) et l'ordre différent
  const sameOrder = order.every((s, i) => s.id === stops[i].id);
  if (sameOrder || suggestedKm >= currentKm * 0.85 || currentKm - suggestedKm < 2) {
    return null;
  }
  return { order, currentKm, suggestedKm };
}
