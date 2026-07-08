"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";

/** Écarte une idée du pool (PHIL-H05) ou la ressort des écartées. */
export async function setIdeaDismissed(
  tripId: string,
  ideaId: string,
  dismissed: boolean,
): Promise<void> {
  if (!areUuids(tripId, ideaId)) {
    return;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // La RLS UPDATE (OWNER/EDITOR du voyage) porte le droit ; on ne touche
  // qu'aux idées non planifiées.
  await supabase
    .from("trip_ideas")
    .update({ status: dismissed ? "DISMISSED" : "POOL" })
    .eq("id", ideaId)
    .eq("trip_id", tripId)
    .neq("status", "SCHEDULED");

  revalidatePath(`/trips/${tripId}/ideas`);
}

/** Quota de super likes par voyageur et par voyage (comme le swipe d'activités). */
const IDEA_SUPER_QUOTA = 5;
const IDEA_VERDICTS = ["YES", "NO", "MAYBE", "SUPER"] as const;
export type IdeaVerdict = (typeof IDEA_VERDICTS)[number];

/**
 * Swipe « Match tes activités » (PHIL-U07) : enregistre (ou remplace) mon verdict
 * sur une idée. Upsert sur la PK `(idea_id, user_id)`. Le quota de super like est
 * appliqué **côté serveur** : au-delà de 5 SUPER dans le voyage, le vote est
 * rétrogradé en YES (`quota_hit=true`) — un super like reste un signal fort.
 */
export async function castIdeaVerdict(
  tripId: string,
  ideaId: string,
  verdict: IdeaVerdict,
): Promise<void> {
  if (!areUuids(tripId, ideaId) || !IDEA_VERDICTS.includes(verdict)) {
    return;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  let finalVerdict: IdeaVerdict = verdict;
  let quotaHit = false;
  if (verdict === "SUPER") {
    // `idea_votes` n'a pas de `trip_id` → on borne le quota aux idées du voyage.
    const { data: tripIdeas } = await supabase
      .from("trip_ideas")
      .select("id")
      .eq("trip_id", tripId);
    const otherIds = (tripIdeas ?? []).map((i) => i.id).filter((id) => id !== ideaId);
    if (otherIds.length > 0) {
      const { count } = await supabase
        .from("idea_votes")
        .select("idea_id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("verdict", "SUPER")
        .in("idea_id", otherIds);
      if ((count ?? 0) >= IDEA_SUPER_QUOTA) {
        finalVerdict = "YES";
        quotaHit = true;
      }
    }
  }

  await supabase
    .from("idea_votes")
    .upsert(
      { idea_id: ideaId, user_id: user.id, verdict: finalVerdict, quota_hit: quotaHit },
      { onConflict: "idea_id,user_id" },
    );
  revalidatePath(`/trips/${tripId}/ideas`);
  revalidatePath(`/trips/${tripId}/ideas/match`);
}

/** Annule mon verdict sur une idée (PHIL-U07) — la ramène dans le deck. */
export async function undoIdeaVerdict(tripId: string, ideaId: string): Promise<void> {
  if (!areUuids(tripId, ideaId)) {
    return;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  await supabase.from("idea_votes").delete().eq("idea_id", ideaId).eq("user_id", user.id);
  revalidatePath(`/trips/${tripId}/ideas`);
  revalidatePath(`/trips/${tripId}/ideas/match`);
}
