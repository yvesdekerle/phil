import { notFound } from "next/navigation";
import { TripOfflineSync } from "@/components/offline/trip-sync";
import { CoverImage } from "@/components/trips/cover-image";
import { TripTabs } from "@/components/trips/trip-tabs";
import { getSessionUser } from "@/lib/auth/session";
import { getDateFnsLocale, getIntlLocale, getT } from "@/lib/i18n/server";
import { getPendingByTrip } from "@/lib/notifications/pending-server";
import { createClient } from "@/lib/supabase/server";
import { formatDateRange } from "@/lib/trips/format";
import { tripStatus } from "@/lib/trips/status";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  en_cours: "bg-lagoon-ink text-card",
  a_venir: "bg-citron text-card",
  passe: "bg-slate/15 text-slate",
  archive: "bg-slate/15 text-slate",
};

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = await createClient();
  const user = await getSessionUser();
  const { data: trip } = await supabase.from("trips").select("*").eq("id", tripId).single();

  if (!trip) {
    // RLS : voyage inexistant ou visiteur non participant — même réponse.
    notFound();
  }

  const status = tripStatus(trip);

  // PHIL-R19 : les deux lots de requêtes ne dépendent que de user+trip → en
  // parallèle plutôt qu'en série (la base distante rend chaque aller-retour cher).
  // PHIL-U02 : pastilles « à voter » sur les onglets. PHIL-N04 : validité passeport.
  const [pendingMap, { data: passports }] = await Promise.all([
    user ? getPendingByTrip(supabase, user.id, [tripId]) : Promise.resolve(null),
    supabase
      .from("documents")
      .select("expires_at")
      .eq("owner_id", user?.id ?? "")
      .eq("category", "passport")
      .is("deleted_at", null)
      .not("expires_at", "is", null)
      .order("expires_at", { ascending: false })
      .limit(1),
  ]);
  const pending = pendingMap?.get(tripId) ?? null;
  const t = await getT();
  const dfLocale = await getDateFnsLocale();
  const il = await getIntlLocale();
  const passportExpiry = passports?.[0]?.expires_at ?? null;
  let passportWarning: { level: "danger" | "warn"; text: string } | null = null;
  if (passportExpiry) {
    const expiry = new Date(passportExpiry);
    const tripEnd = new Date(trip.end_date);
    const sixMonthsAfter = new Date(tripEnd);
    sixMonthsAfter.setMonth(sixMonthsAfter.getMonth() + 6);
    if (expiry < tripEnd) {
      passportWarning = {
        level: "danger",
        text: `${t("passport.expiresBeforePrefix")}${expiry.toLocaleDateString(il)}${t("passport.expiresBeforeSuffix")}`,
      };
    } else if (expiry < sixMonthsAfter) {
      passportWarning = {
        level: "warn",
        text: `${t("passport.expires6Prefix")}${expiry.toLocaleDateString(il)}${t("passport.expires6Suffix")}`,
      };
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <TripOfflineSync tripId={trip.id} />
      {passportWarning ? (
        <div
          className={
            passportWarning.level === "danger"
              ? "mb-4 rounded-lg border border-lagoon-ink/40 bg-lagoon-ink/10 px-4 py-2.5 text-sm text-lagoon-ink"
              : "mb-4 rounded-lg border border-line bg-citron/10 px-4 py-2.5 text-sm text-ink"
          }
        >
          {passportWarning.text}
        </div>
      ) : null}
      <header className="overflow-hidden rounded-lg border border-line bg-card print:hidden">
        <div className="relative h-40 bg-ink sm:h-52">
          {trip.cover_image_url ? (
            <CoverImage
              src={trip.cover_image_url}
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
              priority
              fallbackChar={trip.destination.charAt(0).toUpperCase()}
              fallbackClassName="font-sans text-6xl text-mist italic"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="font-sans text-6xl text-mist italic">
                {trip.destination.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 py-4">
          <div>
            <h1 className="font-sans text-3xl text-ink">{trip.name}</h1>
            <p className="mt-1 text-sm text-slate">
              {trip.destination} · {formatDateRange(trip.start_date, trip.end_date, dfLocale)}
            </p>
          </div>
          <span className={cn("rounded-full px-3 py-1 text-xs font-medium", STATUS_STYLES[status])}>
            {t(`trips.status.${status}`)}
          </span>
        </div>
      </header>

      {/* PHIL-Q37c : le menu du voyage reste collé en haut au défilement */}
      <nav className="sticky top-2 z-[1001] mt-2 rounded-lg border border-line bg-card px-5 shadow-[0_2px_10px_rgba(15,47,56,0.05)] print:hidden">
        <TripTabs
          tripId={trip.id}
          pending={pending ? { ideas: pending.ideas, polls: pending.polls } : undefined}
        />
      </nav>

      <div className="py-6">{children}</div>
    </main>
  );
}
