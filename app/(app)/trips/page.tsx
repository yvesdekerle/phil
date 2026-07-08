import Link from "next/link";
import { redirect } from "next/navigation";
import { TripCard } from "@/components/trips/trip-card";
import { Button } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";
import { getPendingByTrip } from "@/lib/notifications/pending-server";
import { createClient } from "@/lib/supabase/server";
import { sortTrips, type Trip } from "@/lib/trips/status";

type TripWithCount = Trip & { trip_participants: { count: number }[] };

export default async function TripsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase.from("trips").select("*, trip_participants(count)");
  const rows = (data ?? []) as TripWithCount[];
  const counts = new Map(rows.map((t) => [t.id, t.trip_participants[0]?.count ?? 1]));
  const trips = sortTrips(rows);
  const pending = await getPendingByTrip(
    supabase,
    user.id,
    rows.map((t) => t.id),
  );
  const t = await getT();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-encre">{t("trips.title")}</h1>
        <Button asChild>
          <Link href="/trips/new">{t("trips.create")}</Link>
        </Button>
      </div>

      {trips.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-6 py-16 text-center">
          <p className="font-display text-2xl text-encre italic">{t("trips.emptyTitle")}</p>
          <p className="max-w-sm text-sm text-encre-douce">{t("trips.emptyBody")}</p>
          <Button asChild className="mt-2">
            <Link href="/trips/new">{t("trips.create")}</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              participantCount={counts.get(trip.id) ?? 1}
              pendingCount={pending.get(trip.id)?.total ?? 0}
            />
          ))}
        </div>
      )}
    </main>
  );
}
