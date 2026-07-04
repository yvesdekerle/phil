/**
 * Géocodage Nominatim (PHIL-N01) — côté serveur uniquement (politique
 * Nominatim : User-Agent identifiant, ~1 req/s ; usage = saisie manuelle
 * d'événements, très en dessous des limites).
 */
export async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const q = query.trim();
  if (!q) {
    return null;
  }
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, {
      headers: { "User-Agent": "phil-travel-app/1.0 (carnet de voyage privé)" },
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) {
      return null;
    }
    const results = (await r.json()) as { lat: string; lon: string }[];
    if (!results[0]) {
      return null;
    }
    return { lat: Number(results[0].lat), lng: Number(results[0].lon) };
  } catch {
    return null; // le géocodage ne doit jamais bloquer la création
  }
}
