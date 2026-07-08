import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ActivityConsensus,
  type ConsensusActivity,
} from "@/components/activities/activity-consensus";
import { IdeaMatchDeck, type SwipeIdea } from "@/components/ideas/idea-match-deck";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import {
  consensusByActivity,
  hasVotedAll,
  matches,
  participantProgress,
  ranked,
  type Verdict,
  type VoteRow,
} from "@/lib/activities/consensus";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PHIL-U07 — « Match tes activités » : le swipe façon Tinder/Bumble sur les
 * IDÉES du voyage (`trip_ideas`, statut `POOL`). Chacun swipe ses idées non
 * votées ; le consensus agrège tout l'équipage — progression toujours visible,
 * matchs & classement révélés une fois qu'on a soi-même tout tranché (anti-biais).
 */
export default async function IdeaMatchPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const t = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: ideasData }, { data: votes }, { data: members }] = await Promise.all([
    supabase
      .from("trip_ideas")
      .select(
        "id, title, description, location_name, tags, estimated_cost, cost_currency, estimated_duration_minutes",
      )
      .eq("trip_id", tripId)
      .eq("status", "POOL")
      .order("created_at", { ascending: true }),
    supabase
      .from("idea_votes")
      .select("idea_id, user_id, verdict, trip_ideas!inner(trip_id)")
      .eq("trip_ideas.trip_id", tripId),
    supabase
      .from("trip_participants")
      .select("user_id, profiles!trip_participants_user_id_fkey(display_name)")
      .eq("trip_id", tripId),
  ]);

  const all = ideasData ?? [];
  const ideaIds = all.map((i) => i.id);
  const titleById = new Map(all.map((i) => [i.id, i.title]));

  const voteRows: VoteRow[] = (votes ?? []).map((v) => ({
    activityId: v.idea_id,
    userId: v.user_id,
    verdict: v.verdict as Verdict,
  }));
  const participants = (members ?? []).map((m) => ({
    userId: m.user_id,
    name: m.profiles?.display_name ?? t("ideas.travelerFallback"),
  }));

  const myVotedIds = new Set(voteRows.filter((v) => v.userId === user.id).map((v) => v.activityId));
  const deck: SwipeIdea[] = all
    .filter((i) => !myVotedIds.has(i.id))
    .map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      locationName: i.location_name,
      tags: i.tags,
      estimatedCost: i.estimated_cost,
      costCurrency: i.cost_currency,
      durationMinutes: i.estimated_duration_minutes,
    }));
  const meDone = hasVotedAll(user.id, voteRows, all.length);

  const rows = consensusByActivity(ideaIds, voteRows, participants.length);
  const enrich = (r: (typeof rows)[number]): ConsensusActivity => ({
    activityId: r.activityId,
    title: titleById.get(r.activityId) ?? "",
    supers: r.supers,
    likes: r.likes,
    nos: r.nos,
  });
  const matchRows = matches(rows)
    .map(enrich)
    .filter((r) => r.title);
  const rankingRows = ranked(rows)
    .filter((r) => r.voters > 0)
    .map(enrich)
    .filter((r) => r.title);
  const progress = participantProgress(participants, voteRows, all.length);

  return (
    // PHIL-U07 : sur mobile, le match est **plein écran** (immersif façon Yallah,
    // couvre le chrome du voyage) ; inline dans la page sur ≥ sm.
    <div className="fixed inset-0 z-[1100] overflow-y-auto bg-parchemin px-4 pt-6 pb-10 sm:static sm:z-auto sm:overflow-visible sm:bg-transparent sm:p-0">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <RealtimeRefresh tables={["trip_ideas", "idea_votes"]} />
        <div>
          <Link
            href={`/trips/${tripId}/ideas`}
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-encre-douce underline-offset-4 hover:text-encre"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("ideas.match.back")}
          </Link>
          <h1 className="font-display text-2xl text-encre">{t("ideas.match.title")}</h1>
          <p className="mt-1 text-sm text-encre-douce">{t("ideas.match.intro")}</p>
        </div>

        {all.length === 0 ? (
          <p className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-4 py-10 text-center text-sm text-encre-douce">
            {t("ideas.match.noneYet")}
          </p>
        ) : (
          <>
            <IdeaMatchDeck tripId={tripId} ideas={deck} />
            <ActivityConsensus
              progress={progress}
              matches={matchRows}
              ranking={rankingRows}
              meDone={meDone}
              remaining={deck.length}
            />
          </>
        )}
      </div>
    </div>
  );
}
