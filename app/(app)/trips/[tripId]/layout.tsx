import { notFound } from "next/navigation";
import { TripOfflineSync } from "@/components/offline/trip-sync";
import { CoverImage } from "@/components/trips/cover-image";
import { TripTabs } from "@/components/trips/trip-tabs";
import { getDateFnsLocale, getIntlLocale, getT } from "@/lib/i18n/server";
import { getPendingByTrip } from "@/lib/notifications/pending-server";
import { createClient } from "@/lib/supabase/server";
import { formatDateRange } from "@/lib/trips/format";
import { tripStatus } from "@/lib/trips/status";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  en_cours: "bg-bordeaux text-papier",
  a_venir: "bg-laiton text-papier",
  passe: "bg-encre-douce/15 text-encre-douce",
  archive: "bg-encre-douce/15 text-encre-douce",
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: trip } = await supabase.from("trips").select("*").eq("id", tripId).single();

  if (!trip) {
    // RLS : voyage inexistant ou visiteur non participant — même réponse.
    notFound();
  }

  const status = tripStatus(trip);
  // PHIL-U02 : pastilles « à voter » sur les onglets Sondages / Idées / À swiper.
  const pending = user
    ? ((await getPendingByTrip(supabase, user.id, [tripId])).get(tripId) ?? null)
    : null;
  const t = await getT();
  const dfLocale = await getDateFnsLocale();
  const il = await getIntlLocale();

  // PHIL-N04 : validité du passeport vs dates du voyage (règle des 6 mois)
  const { data: passports } = await supabase
    .from("documents")
    .select("expires_at")
    .eq("owner_id", user?.id ?? "")
    .eq("category", "passport")
    .is("deleted_at", null)
    .not("expires_at", "is", null)
    .order("expires_at", { ascending: false })
    .limit(1);
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
              ? "mb-4 rounded-lg border border-bordeaux/40 bg-bordeaux/10 px-4 py-2.5 text-sm text-bordeaux"
              : "mb-4 rounded-lg border border-laiton bg-laiton/10 px-4 py-2.5 text-sm text-encre"
          }
        >
          {passportWarning.text}
        </div>
      ) : null}
      <header className="overflow-hidden rounded-lg border border-laiton-clair bg-papier print:hidden">
        <div className="relative h-40 bg-encre sm:h-52">
          {trip.cover_image_url ? (
            <CoverImage
              src={trip.cover_image_url}
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
              priority
              fallbackChar={trip.destination.charAt(0).toUpperCase()}
              fallbackClassName="font-display text-6xl text-laiton italic"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="font-display text-6xl text-laiton italic">
                {trip.destination.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 py-4">
          <div>
            <h1 className="font-display text-3xl text-encre">{trip.name}</h1>
            <p className="mt-1 text-sm text-encre-douce">
              {trip.destination} · {formatDateRange(trip.start_date, trip.end_date, dfLocale)}
            </p>
          </div>
          <span className={cn("rounded-full px-3 py-1 text-xs font-medium", STATUS_STYLES[status])}>
            {t(`trips.status.${status}`)}
          </span>
        </div>
      </header>

      {/* PHIL-Q37c : le menu du voyage reste collé en haut au défilement */}
      <nav className="sticky top-2 z-[1001] mt-2 rounded-lg border border-laiton-clair bg-papier px-5 shadow-[0_2px_10px_rgba(31,42,68,0.05)] print:hidden">
        <TripTabs
          tripId={trip.id}
          pending={
            pending
              ? { ideas: pending.ideas, activities: pending.activities, polls: pending.polls }
              : undefined
          }
        />
      </nav>

      <div className="py-6">{children}</div>
    </main>
  );
}
