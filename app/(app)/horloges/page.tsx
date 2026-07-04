import { redirect } from "next/navigation";
import { type ClockEntry, WorldClocks } from "@/components/trips/world-clocks";
import { createClient } from "@/lib/supabase/server";

/**
 * Horloges (PHIL-Q29) — transversal aux voyages, comme les horloges monde
 * d'un téléphone : chez soi + chaque destination, triées par décalage UTC.
 */
export default async function ClocksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: trips }] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", user.id).single(),
    supabase
      .from("trips")
      .select("destination, default_timezone, archived_at")
      .is("archived_at", null)
      .order("start_date", { ascending: true }),
  ]);

  const homeTimezone = profile?.timezone ?? "Europe/Paris";
  const homeLabel = homeTimezone.split("/").pop()?.replace(/_/g, " ") ?? homeTimezone;

  const clocks: ClockEntry[] = [{ timezone: homeTimezone, label: homeLabel, isHome: true }];
  const seen = new Set([homeTimezone]);
  for (const t of trips ?? []) {
    if (!seen.has(t.default_timezone)) {
      seen.add(t.default_timezone);
      clocks.push({ timezone: t.default_timezone, label: t.destination });
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl text-encre">Horloges</h1>
        <p className="mt-1 text-sm text-encre-douce">
          L'heure chez toi et à chacune de tes destinations — du fuseau le plus tôt au plus tard.
        </p>
      </div>
      <WorldClocks clocks={clocks} />
      {clocks.length === 1 ? (
        <p className="text-sm text-encre-douce">
          Ajoute un voyage vers un autre fuseau et son horloge apparaîtra ici.
        </p>
      ) : null}
    </div>
  );
}
