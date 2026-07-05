import Link from "next/link";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { type Candidate, LodgingClient } from "./lodging-client";

/** Hébergements candidats (PHIL-L01) : comparer, puis trancher. */
export default async function LodgingCandidatesPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const t = await getT();

  const [{ data: candidates }, { data: me }] = await Promise.all([
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
        <Link
          href={`/trips/${tripId}/ideas`}
          className="text-sm text-encre-douce underline underline-offset-4 hover:text-encre"
        >
          {t("ideas.backToIdeas")}
        </Link>
        <h1 className="mt-2 font-display text-2xl text-encre">{t("lodging.title")}</h1>
        <p className="mt-1 text-sm text-encre-douce">{t("lodging.subtitle")}</p>
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
    </div>
  );
}
