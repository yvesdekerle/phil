import { redirect } from "next/navigation";
import {
  ActivityConsensus,
  type ConsensusActivity,
} from "@/components/activities/activity-consensus";
import { AddActivityForm } from "@/components/activities/add-activity-form";
import { type SwipeActivity, SwipeDeck } from "@/components/activities/swipe-deck";
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
 * PHIL-U04 — Onglet « À swiper » : deck d'activités du voyage + consensus du
 * groupe (Phase 2). Chacun swipe ses activités non votées ; le consensus agrège
 * tous les votes de l'équipage — progression toujours visible, matchs et
 * classement **révélés une fois qu'on a soi-même tout tranché** (anti-biais).
 */
export default async function ActivitiesPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const t = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: activities }, { data: votes }, { data: members }] = await Promise.all([
    supabase
      .from("trip_activities")
      .select(
        "id, title, description, category, location, tags, photo_urls, price_text, duration_text",
      )
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true }),
    supabase.from("activity_votes").select("activity_id, user_id, verdict").eq("trip_id", tripId),
    supabase
      .from("trip_participants")
      .select("user_id, profiles!trip_participants_user_id_fkey(display_name)")
      .eq("trip_id", tripId),
  ]);

  const all = activities ?? [];
  const activityIds = all.map((a) => a.id);
  const titleById = new Map(all.map((a) => [a.id, a.title]));

  const voteRows: VoteRow[] = (votes ?? []).map((v) => ({
    activityId: v.activity_id,
    userId: v.user_id,
    verdict: v.verdict as Verdict,
  }));
  const participants = (members ?? []).map((m) => ({
    userId: m.user_id,
    name: m.profiles?.display_name ?? t("activities.someone"),
  }));

  const myVotedIds = new Set(voteRows.filter((v) => v.userId === user.id).map((v) => v.activityId));
  const deck: SwipeActivity[] = all
    .filter((a) => !myVotedIds.has(a.id))
    .map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      category: a.category,
      location: a.location,
      tags: a.tags,
      photoUrls: a.photo_urls,
      priceText: a.price_text,
      durationText: a.duration_text,
    }));
  const meDone = hasVotedAll(user.id, voteRows, all.length);

  const rows = consensusByActivity(activityIds, voteRows, participants.length);
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
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <RealtimeRefresh tables={["trip_activities", "activity_votes"]} />
      <div>
        <h1 className="font-display text-2xl text-encre">{t("activities.title")}</h1>
        <p className="mt-1 text-sm text-encre-douce">{t("activities.intro")}</p>
      </div>

      {all.length === 0 ? (
        <p className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-4 py-10 text-center text-sm text-encre-douce">
          {t("activities.noneYet")}
        </p>
      ) : (
        <SwipeDeck tripId={tripId} activities={deck} />
      )}

      <AddActivityForm tripId={tripId} />

      {all.length > 0 ? (
        <ActivityConsensus
          progress={progress}
          matches={matchRows}
          ranking={rankingRows}
          meDone={meDone}
          remaining={deck.length}
        />
      ) : null}
    </div>
  );
}
