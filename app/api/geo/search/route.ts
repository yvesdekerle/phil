import { createClient } from "@/lib/supabase/server";

/**
 * Recherche de lieu (PHIL-P07) — proxy Photon (komoot, basé OSM, gratuit) :
 * la CSP interdit les appels directs du navigateur vers des hôtes externes.
 * Authentifié pour ne pas servir de relais public.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Authentification requise" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 3) {
    return Response.json({ results: [] });
  }
  // Biais géographique optionnel (autour de la destination du voyage)
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const bias =
    Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)
      ? `&lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}`
      : "";

  try {
    const r = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=fr${bias}`,
      { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(4000) },
    );
    if (!r.ok) {
      return Response.json({ results: [] });
    }
    const json = (await r.json()) as {
      features?: {
        properties: {
          name?: string;
          street?: string;
          housenumber?: string;
          postcode?: string;
          city?: string;
          country?: string;
        };
        geometry: { coordinates: [number, number] };
      }[];
    };
    const results = (json.features ?? []).map((f) => {
      const p = f.properties;
      const address = [
        [p.housenumber, p.street].filter(Boolean).join(" "),
        [p.postcode, p.city].filter(Boolean).join(" "),
        p.country,
      ]
        .filter(Boolean)
        .join(", ");
      return {
        name: p.name ?? p.street ?? q,
        detail: [p.city, p.country].filter(Boolean).join(", "),
        address,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      };
    });
    return Response.json({ results });
  } catch {
    return Response.json({ results: [] });
  }
}
