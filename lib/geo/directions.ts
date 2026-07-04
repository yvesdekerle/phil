/**
 * Liens d'itinéraire Google Maps (PHIL-Q13) — les URL universelles
 * https://www.google.com/maps/dir/ ouvrent l'application native sur mobile
 * quand elle est installée, le site sinon.
 */

export type LatLng = { lat: number; lng: number };

const fmt = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

/** Itinéraire d'un point à un autre (voiture). */
export function directionsUrl(from: LatLng, to: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${fmt(from)}&destination=${fmt(to)}&travelmode=driving`;
}

/** Navigation vers une destination — Google Maps part de la position actuelle. */
export function navigateUrl(to: LatLng | string): string {
  const destination = typeof to === "string" ? encodeURIComponent(to) : fmt(to);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
}
