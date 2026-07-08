import { createClient } from "@/lib/supabase/server";
import { PORTABLE_TRIP_VERSION } from "@/lib/trips/portable";

export const dynamic = "force-dynamic";

/**
 * Export « voyage portable » (PHIL-Q19) — squelette JSON du voyage (contenu
 * planifiable, sans documents/coffre ni données personnelles). Filtré par
 * `trip_id` et **borné par la RLS** : seul un participant peut lire le voyage.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Authentification requise" }, { status: 401 });
  }

  // RLS : renvoie une ligne seulement si l'utilisateur est participant du voyage.
  const { data: trip } = await supabase
    .from("trips")
    .select(
      "name, destination, start_date, end_date, default_timezone, destination_lat, destination_lng",
    )
    .eq("id", tripId)
    .single();
  if (!trip) {
    return Response.json({ error: "Voyage introuvable" }, { status: 404 });
  }

  const [{ data: events }, { data: ideas }, { data: checklist }, { data: candidates }] =
    await Promise.all([
      supabase
        .from("trip_events")
        .select(
          "title, type, starts_at, ends_at, timezone, location_name, location_address, location_lat, location_lng, notes, metadata",
        )
        .eq("trip_id", tripId)
        .order("starts_at"),
      supabase
        .from("trip_ideas")
        .select(
          "title, description, tags, external_url, estimated_cost, cost_currency, estimated_duration_minutes, location_name, location_lat, location_lng",
        )
        .eq("trip_id", tripId)
        .order("created_at"),
      supabase
        .from("checklist_items")
        .select("section, category, title, quantity, due_date, position")
        .eq("trip_id", tripId)
        .order("position"),
      supabase
        .from("lodging_candidates")
        .select("title, url, price, notes, check_in, check_out")
        .eq("trip_id", tripId)
        .order("check_in"),
    ]);

  const payload = {
    version: PORTABLE_TRIP_VERSION,
    exported_at: new Date().toISOString(),
    trip,
    events: events ?? [],
    ideas: ideas ?? [],
    checklist: checklist ?? [],
    lodgingCandidates: candidates ?? [],
  };

  const slug =
    trip.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "voyage";

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="phil-${slug}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
