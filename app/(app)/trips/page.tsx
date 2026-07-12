import { ChevronRight, Compass, Lock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ImportTripButton } from "@/components/trips/import-trip-button";
import { TripCard } from "@/components/trips/trip-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getT } from "@/lib/i18n/server";
import { getPendingByTrip } from "@/lib/notifications/pending-server";
import { getOwnProfile } from "@/lib/supabase/profiles";
import { createClient } from "@/lib/supabase/server";
import { sortTrips, type Trip, tripStatus } from "@/lib/trips/status";

type TripWithCount = Trip & { trip_participants: { count: number }[] };

export default async function TripsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data }, profile, { count: vaultCount }] = await Promise.all([
    supabase.from("trips").select("*, trip_participants(count)"),
    getOwnProfile(supabase),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("scope", "VAULT")
      .is("deleted_at", null),
  ]);
  const rows = (data ?? []) as TripWithCount[];
  const counts = new Map(rows.map((t) => [t.id, t.trip_participants[0]?.count ?? 1]));
  const trips = sortTrips(rows);
  const pending = await getPendingByTrip(
    supabase,
    user.id,
    rows.map((t) => t.id),
  );
  const t = await getT();

  const active = trips.filter((trip) => !["passe", "archive"].includes(tripStatus(trip)));
  const past = trips.filter((trip) => ["passe", "archive"].includes(tripStatus(trip)));
  const firstName = (profile?.display_name ?? "").split(" ")[0];

  return (
    <main className="mx-auto w-full max-w-content flex-1 px-4 py-6 lg:px-6">
      <PageHeader
        kicker={firstName ? t("trips.hello").replace("{name}", firstName) : undefined}
        title={t("trips.title")}
        actions={
          <>
            <ImportTripButton />
            <Button size="sm" asChild>
              <Link href="/trips/new">{t("trips.create")}</Link>
            </Button>
          </>
        }
      />

      {trips.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<Compass />}
          title={t("trips.emptyTitle")}
          description={t("trips.emptyBody")}
          action={
            <Button asChild>
              <Link href="/trips/new">{t("trips.create")}</Link>
            </Button>
          }
        />
      ) : (
        <>
          {active.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {active.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  participantCount={counts.get(trip.id) ?? 1}
                  pendingCount={pending.get(trip.id)?.total ?? 0}
                />
              ))}
            </div>
          ) : null}

          {/* Accès Coffre mobile seulement (V06b) — le header desktop a déjà le lien. */}
          <Link
            href="/vault"
            className="mt-4 flex items-center gap-3.5 rounded-lg bg-ink p-4 transition-all outline-none hover:-translate-y-px hover:shadow-float focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand lg:hidden"
          >
            <span
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10"
            >
              <Lock className="size-5 text-lagoon-soft" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-subhead text-white">{t("trips.vaultTitle")}</span>
              <span className="mt-0.5 block text-caption text-lagoon-soft">
                {vaultCount
                  ? t("trips.vaultSubtitle").replace("{n}", String(vaultCount))
                  : t("trips.vaultSubtitleEmpty")}
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="size-4.5 shrink-0 text-lagoon-soft" />
          </Link>

          {past.length > 0 ? (
            <>
              <p className="mt-8 mb-2.5 font-mono text-label text-mist uppercase">
                {t("trips.past")}
              </p>
              {/* V07c : même format que les actifs, en grisé — la rangée pleine
                  largeur détonnait. */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {past.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    past
                    participantCount={counts.get(trip.id) ?? 1}
                    pendingCount={pending.get(trip.id)?.total ?? 0}
                  />
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </main>
  );
}
