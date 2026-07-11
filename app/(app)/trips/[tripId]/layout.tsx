import { notFound } from "next/navigation";
import { TripMain } from "@/components/layout/trip-main";
import { TripSidebar, TripTabBar } from "@/components/layout/trip-nav";
import { TripPageHeader } from "@/components/layout/trip-page-header";
import { TripOfflineSync } from "@/components/offline/trip-sync";
import { getSessionUser } from "@/lib/auth/session";
import { getDateFnsLocale, getIntlLocale, getT } from "@/lib/i18n/server";
import { getPendingByTrip } from "@/lib/notifications/pending-server";
import { getOwnProfile } from "@/lib/supabase/profiles";
import { createClient } from "@/lib/supabase/server";
import { formatDateRange } from "@/lib/trips/format";

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

  // PHIL-R19 : requêtes indépendantes en parallèle (la base distante rend
  // chaque aller-retour cher). PHIL-U02 : pastilles « à voter ».
  // PHIL-N04 : validité passeport.
  const [pendingMap, { data: passports }, profile, { count: participantCount }] = await Promise.all(
    [
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
      getOwnProfile(supabase),
      supabase
        .from("trip_participants")
        .select("user_id", { count: "exact", head: true })
        .eq("trip_id", tripId),
    ],
  );
  const pending = pendingMap?.get(tripId) ?? null;
  const pendingProps = pending ? { ideas: pending.ideas, polls: pending.polls } : undefined;
  const t = await getT();
  const il = await getIntlLocale();
  const dfLocale = await getDateFnsLocale();
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

  const initial = (profile?.display_name ?? "?").charAt(0).toUpperCase();
  const tripMeta = `${formatDateRange(trip.start_date, trip.end_date, dfLocale)} · ${t(
    "trips.onboard",
  ).replace("{n}", String(participantCount ?? 1))}`;

  return (
    <div className="flex w-full flex-1 flex-col lg:flex-row">
      <TripOfflineSync tripId={trip.id} />
      <TripSidebar
        tripId={trip.id}
        tripName={trip.name}
        tripMeta={tripMeta}
        pending={pendingProps}
        avatarUrl={profile?.avatar_url ?? null}
        initial={initial}
        userName={profile?.display_name ?? initial}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TripPageHeader
          tripId={trip.id}
          tripName={trip.name}
          avatarUrl={profile?.avatar_url ?? null}
          initial={initial}
        />
        <TripMain>
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
          {children}
        </TripMain>
      </div>
      <TripTabBar tripId={trip.id} pending={pendingProps} />
    </div>
  );
}
