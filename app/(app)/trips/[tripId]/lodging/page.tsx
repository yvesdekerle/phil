import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EventTypeIcon } from "@/components/calendar/event-type-icon";
import { getDateFnsLocale, getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { type Candidate, LodgingClient } from "./lodging-client";

/** Logement (PHIL-Q37c) : hébergements réservés (calendrier) + candidats à trancher. */
export default async function LodgingPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const t = await getT();
  const dfLocale = await getDateFnsLocale();

  const [{ data: booked }, { data: candidates }, { data: me }] = await Promise.all([
    supabase
      .from("trip_events")
      .select("id, title, starts_at, ends_at, timezone, location_name")
      .eq("trip_id", tripId)
      .eq("type", "LODGING")
      .order("starts_at", { ascending: true }),
    supabase
      .from("lodging_candidates")
      .select(
        "id, title, url, price, notes, check_in, check_out, status, created_by, profiles!lodging_candidates_created_by_fkey(display_name)",
      )
      .eq("trip_id", tripId)
      .order("check_in", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("trip_participants")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single(),
  ]);

  // PHIL-L02 : avis pondérés des candidats du voyage
  const candidateIds = (candidates ?? []).map((c) => c.id);
  const { data: votes } = candidateIds.length
    ? await supabase
        .from("candidate_votes")
        .select(
          "candidate_id, user_id, rating, comment, profiles!candidate_votes_user_id_fkey(display_name)",
        )
        .in("candidate_id", candidateIds)
    : { data: [] };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-sans text-2xl text-ink">{t("lodging.pageTitle")}</h1>
        <p className="mt-1 text-sm text-slate">{t("lodging.pageIntro")}</p>
      </div>

      {/* Hébergements réservés (les nuits du calendrier) */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-ink">{t("lodging.bookedTitle")}</h2>
        {(booked ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-line bg-card/60 px-4 py-6 text-center text-sm text-slate">
            {t("lodging.bookedEmpty")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(booked ?? []).map((e) => (
              <li key={e.id}>
                <Link
                  href={`/trips/${tripId}/events/${e.id}`}
                  className="flex items-center gap-3 rounded-lg border border-line bg-card px-4 py-3 transition-shadow hover:shadow-[0_2px_12px_rgba(15,47,56,0.08)]"
                >
                  <EventTypeIcon type="LODGING" className="size-7 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{e.title}</span>
                    <span className="block truncate text-xs text-slate">
                      {formatInTimeZone(e.starts_at, e.timezone, "d MMM", { locale: dfLocale })}
                      {e.ends_at
                        ? ` → ${formatInTimeZone(e.ends_at, e.timezone, "d MMM", { locale: dfLocale })}`
                        : ""}
                      {e.location_name ? ` · ${e.location_name}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Hébergements candidats (avant le départ : comparer et trancher) */}
      <section className="flex flex-col gap-2">
        <div>
          <h2 className="text-sm font-medium text-ink">{t("lodging.title")}</h2>
          <p className="mt-0.5 text-xs text-slate">{t("lodging.subtitle")}</p>
        </div>
        <LodgingClient
          tripId={tripId}
          candidates={(candidates ?? []).map(
            (c): Candidate => ({
              id: c.id,
              title: c.title,
              url: c.url,
              price: c.price,
              notes: c.notes,
              checkIn: c.check_in,
              checkOut: c.check_out,
              status: c.status as Candidate["status"],
              createdBy: c.created_by,
              authorName: c.profiles?.display_name ?? t("lodging.travelerFallback"),
            }),
          )}
          votes={(votes ?? []).map((v) => ({
            candidateId: v.candidate_id,
            userId: v.user_id,
            rating: v.rating,
            comment: v.comment,
            name: v.profiles?.display_name ?? t("lodging.travelerFallback"),
          }))}
          myId={user.id}
          role={me?.role ?? "VIEWER"}
        />
      </section>
    </div>
  );
}
