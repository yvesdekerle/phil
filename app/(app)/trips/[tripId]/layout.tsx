import { notFound } from "next/navigation";
import { TripSidebar, TripTabBar } from "@/components/layout/trip-nav";
import { TripOfflineSync } from "@/components/offline/trip-sync";
import { CoverImage } from "@/components/trips/cover-image";
import { Badge } from "@/components/ui/badge";
import { getSessionUser } from "@/lib/auth/session";
import { getDateFnsLocale, getIntlLocale, getT } from "@/lib/i18n/server";
import { getPendingByTrip } from "@/lib/notifications/pending-server";
import { createClient } from "@/lib/supabase/server";
import { formatDateRange } from "@/lib/trips/format";
import { tripStatus } from "@/lib/trips/status";

const STATUS_VARIANTS: Record<string, "lagoon" | "citron" | "neutral"> = {
  en_cours: "lagoon",
  a_venir: "citron",
  passe: "neutral",
  archive: "neutral",
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
  const pendingProps = pending ? { ideas: pending.ideas, polls: pending.polls } : undefined;
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
    <main className="mx-auto w-full max-w-content flex-1 px-4 py-6 pb-24 lg:px-6 lg:pb-6">
      <TripOfflineSync tripId={trip.id} />
      <div className="lg:flex lg:gap-6">
        <TripSidebar tripId={trip.id} pending={pendingProps} />
        <div className="min-w-0 flex-1">
          {passportWarning ? (
            <div
              className={
                passportWarning.level === "danger"
                  ? "mb-4 rounded-lg border border-berry-ink/30 bg-berry-wash px-4 py-2.5 text-body text-berry-ink"
                  : "mb-4 rounded-lg border border-line bg-citron-wash px-4 py-2.5 text-body text-ink"
              }
            >
              {passportWarning.text}
            </div>
          ) : null}
          <header className="overflow-hidden rounded-lg border border-line bg-card print:hidden">
            <div className="relative h-40 bg-ink-deep sm:h-52">
              {trip.cover_image_url ? (
                <CoverImage
                  src={trip.cover_image_url}
                  sizes="(max-width: 1024px) 100vw, 980px"
                  className="object-cover"
                  priority
                  fallbackChar={trip.destination.charAt(0).toUpperCase()}
                  fallbackClassName="text-6xl font-extrabold text-lagoon-soft"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-6xl font-extrabold text-lagoon-soft">
                    {trip.destination.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3 px-4 py-4">
              <div className="min-w-0">
                <h1 className="text-title text-ink">{trip.name}</h1>
                <p className="mt-1 font-mono text-data font-normal text-slate">
                  {trip.destination} · {formatDateRange(trip.start_date, trip.end_date, dfLocale)}
                </p>
              </div>
              <Badge variant={STATUS_VARIANTS[status]}>{t(`trips.status.${status}`)}</Badge>
            </div>
          </header>

          <div className="py-6">{children}</div>
        </div>
      </div>
      <TripTabBar tripId={trip.id} pending={pendingProps} />
    </main>
  );
}
