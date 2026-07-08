import { redirect } from "next/navigation";
import { AddActivityForm } from "@/components/activities/add-activity-form";
import { SwipeDeck } from "@/components/activities/swipe-deck";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PHIL-U04 — Onglet « À swiper » : deck d'activités du voyage + classement de
 * consensus du groupe (vue `activity_vote_summary`). Chacun swipe ses activités
 * non encore votées ; le classement agrège tous les votes de l'équipage.
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

  const [{ data: activities }, { data: myVotes }, { data: summary }] = await Promise.all([
    supabase
      .from("trip_activities")
      .select("id, title, description, category, location, tags")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true }),
    supabase
      .from("activity_votes")
      .select("activity_id")
      .eq("trip_id", tripId)
      .eq("user_id", user.id),
    supabase
      .from("activity_vote_summary")
      .select("activity_id, supers, likes, nos, score")
      .eq("trip_id", tripId),
  ]);

  const all = activities ?? [];
  const votedIds = new Set((myVotes ?? []).map((v) => v.activity_id));
  const deck = all.filter((a) => !votedIds.has(a.id));

  const titleById = new Map(all.map((a) => [a.id, a.title]));
  const ranking = (summary ?? [])
    .map((s) => ({
      activityId: s.activity_id,
      title: titleById.get(s.activity_id ?? "") ?? "",
      supers: s.supers ?? 0,
      likes: s.likes ?? 0,
      nos: s.nos ?? 0,
      score: s.score ?? 0,
    }))
    .filter((r) => r.title)
    .sort((a, b) => b.score - a.score);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
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

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-encre">{t("activities.consensusTitle")}</h2>
        {ranking.length === 0 ? (
          <p className="text-sm text-encre-douce">{t("activities.consensusEmpty")}</p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {ranking.map((r, i) => (
              <li
                key={r.activityId}
                className="flex items-center justify-between gap-3 rounded-lg border border-laiton-clair bg-papier px-4 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="font-display text-laiton">{i + 1}</span>
                  <span className="truncate text-sm text-encre">{r.title}</span>
                </span>
                <span className="shrink-0 text-xs text-encre-douce">
                  {t("activities.votesSummary")
                    .replace("{supers}", String(r.supers))
                    .replace("{likes}", String(r.likes))
                    .replace("{nos}", String(r.nos))}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
