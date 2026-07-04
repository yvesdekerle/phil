import Link from "next/link";
import { redirect } from "next/navigation";
import { haversineKm } from "@/lib/geo/distance";
import { createClient } from "@/lib/supabase/server";

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
  const [{ data: trips }, { data: events }, { count: photoCount }, { count: journalCount }] =
    await Promise.all([
      supabase.from("trips").select("id, name, destination, start_date, end_date"),
      supabase
        .from("trip_events")
        .select("trip_id, type, starts_at, location_lat, location_lng")
        .order("starts_at", { ascending: true }),
      supabase.from("trip_photos").select("id", { count: "exact", head: true }),
      supabase
        .from("journal_entries")
        .select("trip_id", { count: "exact", head: true })
        .eq("author_id", user.id),
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
      </div>

      <p className="mt-6 text-sm text-encre-douce">
        <Link href="/trips" className="underline underline-offset-4 hover:text-encre">
          ← Retour aux voyages
        </Link>
      </p>
    </main>
  );
}
