import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgesGrid } from "@/components/explorer/badges-grid";
import { WorldMapLazy } from "@/components/map/world-map-lazy";
import { computeBadges } from "@/lib/gamification/badges";
import { countryAt } from "@/lib/geo/country-lookup";
import { haversineKm } from "@/lib/geo/distance";
import { createClient } from "@/lib/supabase/server";
import { CountrySuggestions } from "./country-suggestions";

const WORLD_TOUR_KM = 40_075;

function Stat({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-laiton-clair bg-papier px-4 py-3 text-center">
      <p className="font-display text-2xl text-bordeaux">{value}</p>
      <p className="text-xs text-encre-douce">{label}</p>
      {hint ? <p className="mt-0.5 text-[0.65rem] text-encre-douce/70">{hint}</p> : null}
    </div>
  );
}

/** Carnet de l'explorateur (PHIL-P09) : les chiffres de tes voyages. */
export default async function ExplorerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // La RLS ne renvoie que mes voyages ; tout le reste en découle.
  const [
    { data: trips },
    { data: events },
    { count: photoCount },
    { count: journalCount },
    { data: visitedRows },
  ] = await Promise.all([
    supabase
      .from("trips")
      .select("id, name, destination, destination_lat, destination_lng, start_date, end_date"),
    supabase
      .from("trip_events")
      .select("trip_id, type, starts_at, location_lat, location_lng")
      .order("starts_at", { ascending: true }),
    supabase.from("trip_photos").select("id", { count: "exact", head: true }),
    supabase
      .from("journal_entries")
      .select("trip_id", { count: "exact", head: true })
      .eq("author_id", user.id),
    supabase.from("visited_countries").select("country_code"),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const allTrips = trips ?? [];
  const doneTrips = allTrips.filter((t) => t.end_date < today);
  const travelDays = allTrips.reduce(
    (sum, t) =>
      sum +
      Math.round((new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) / 86_400_000) +
      1,
    0,
  );
  const destinations = new Set(allTrips.map((t) => t.destination.trim().toLowerCase()));
  const activityCount = (events ?? []).filter((e) => e.type === "ACTIVITY").length;

  // Km parcourus : haversine entre événements géolocalisés consécutifs, par voyage
  let km = 0;
  for (const trip of allTrips) {
    const points = (events ?? [])
      .filter((e) => e.trip_id === trip.id && e.location_lat !== null && e.location_lng !== null)
      .map((e) => ({ lat: e.location_lat as number, lng: e.location_lng as number }));
    for (let i = 1; i < points.length; i++) {
      km += haversineKm(points[i - 1], points[i]);
    }
  }
  const worldShare = km / WORLD_TOUR_KM;

  // PHIL-P13 : pays visités + suggestions depuis les voyages passés géocodés
  const visited = (visitedRows ?? []).map((v) => v.country_code);
  const visitedSet = new Set(visited);
  const suggestionsRaw = await Promise.all(
    doneTrips
      .filter((t) => t.destination_lat !== null && t.destination_lng !== null)
      .map((t) => countryAt(t.destination_lat as number, t.destination_lng as number)),
  );
  const suggestions = [
    ...new Map(
      suggestionsRaw
        .filter((c): c is NonNullable<typeof c> => c !== null && !visitedSet.has(c.code))
        .map((c) => [c.code, c]),
    ).values(),
  ];

  // PHIL-P12 : compteurs de contribution personnels pour les badges
  const [
    { count: packItems },
    { count: myIdeas },
    { count: ideaVotes },
    { count: pollVotes },
    { count: candidateVotes },
    { count: emergencySheets },
    { count: myDocuments },
    { count: myPhotos },
  ] = await Promise.all([
    supabase
      .from("checklist_items")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id),
    supabase
      .from("trip_ideas")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id),
    supabase
      .from("idea_votes")
      .select("idea_id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("poll_votes")
      .select("poll_id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("candidate_votes")
      .select("candidate_id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("emergency_sheets")
      .select("trip_id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .is("deleted_at", null),
    supabase
      .from("trip_photos")
      .select("id", { count: "exact", head: true })
      .eq("uploaded_by", user.id),
  ]);

  const badges = computeBadges({
    trips: allTrips.length,
    doneTrips: doneTrips.length,
    travelDays,
    km,
    countries: visited.length,
    packItems: packItems ?? 0,
    ideas: myIdeas ?? 0,
    votes: (ideaVotes ?? 0) + (pollVotes ?? 0) + (candidateVotes ?? 0),
    journalPages: journalCount ?? 0,
    photos: myPhotos ?? 0,
    emergencySheets: emergencySheets ?? 0,
    documents: myDocuments ?? 0,
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="font-display text-3xl text-encre">Carnet de l'explorateur</h1>
      <p className="mt-1 mb-6 text-sm text-encre-douce">
        {km > 0
          ? `Tu as bouclé ${(worldShare * 100).toFixed(worldShare >= 0.1 ? 0 : 1)} % d'un tour du monde — Phileas l'a fait en 80 jours, rien ne presse.`
          : "Chaque tour du monde commence par un premier événement géolocalisé."}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat value={String(allTrips.length)} label="voyages au carnet" />
        <Stat
          value={String(doneTrips.length)}
          label="voyages bouclés"
          hint={allTrips.length > doneTrips.length ? "le reste est en préparation" : undefined}
        />
        <Stat value={String(travelDays)} label="jours de voyage" hint="planifiés compris" />
        <Stat value={String(destinations.size)} label="destinations" />
        <Stat value={String(activityCount)} label="activités au programme" />
        <Stat
          value={
            km >= 100 ? `${Math.round(km).toLocaleString("fr-FR")} km` : `${Math.round(km)} km`
          }
          label="parcourus (à vol d'oiseau)"
          hint="entre les étapes géolocalisées"
        />
        <Stat value={String(photoCount ?? 0)} label="photos partagées" />
        <Stat value={String(journalCount ?? 0)} label="pages de journal" />
        <Stat value={String(visited.length)} label="pays visités" hint="coche-les sur la carte" />
      </div>

      <section className="mt-8">
        <h2 className="mb-1 font-display text-xl text-encre">Ta mappemonde</h2>
        <p className="mb-3 text-sm text-encre-douce">
          Clique un pays pour le marquer visité — en couleur les conquêtes, en parchemin le reste du
          monde à découvrir.
        </p>
        <CountrySuggestions suggestions={suggestions} />
        <WorldMapLazy visited={visited} />
      </section>

      <BadgesGrid badges={badges} />

      <p className="mt-6 text-sm text-encre-douce">
        <Link href="/trips" className="underline underline-offset-4 hover:text-encre">
          ← Retour aux voyages
        </Link>
      </p>
    </main>
  );
}
