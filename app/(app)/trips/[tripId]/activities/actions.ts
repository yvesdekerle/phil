"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { getT } from "@/lib/i18n/server";
import { areUuids } from "@/lib/validation";

/** Quota de coups de cœur (SUPER) par voyageur et par voyage (comme Yallah). */
const SUPER_QUOTA = 5;
const VERDICTS = ["YES", "NO", "MAYBE", "SUPER"] as const;
type Verdict = (typeof VERDICTS)[number];

export type ActivityFormState = { status: "idle" | "error"; message?: string };

/**
 * Enregistre (ou remplace) le vote de l'utilisateur sur une activité (PHIL-U04).
 * Upsert sur `(activity_id, user_id)`. Le quota SUPER est appliqué **côté
 * serveur** (jamais de confiance au client) : au-delà de 5 SUPER dans le voyage,
 * le vote est rétrogradé en YES avec `quota_hit=true`.
 */
export async function castVote(
  tripId: string,
  activityId: string,
  verdict: Verdict,
): Promise<void> {
  if (!areUuids(tripId, activityId) || !VERDICTS.includes(verdict)) {
    return;
  }
  const { supabase, user } = await requireUser();

  let finalVerdict: Verdict = verdict;
  let quotaHit = false;
  if (verdict === "SUPER") {
    const { count } = await supabase
      .from("activity_votes")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .eq("verdict", "SUPER")
      .neq("activity_id", activityId);
    if ((count ?? 0) >= SUPER_QUOTA) {
      finalVerdict = "YES";
      quotaHit = true;
    }
  }

  // RLS `activity_votes_write_own` : n'écrit que ses propres votes.
  await supabase.from("activity_votes").upsert(
    {
      activity_id: activityId,
      trip_id: tripId,
      user_id: user.id,
      verdict: finalVerdict,
      quota_hit: quotaHit,
    },
    { onConflict: "activity_id,user_id" },
  );
  revalidatePath(`/trips/${tripId}/activities`);
}

/** Annule le dernier verdict de l'utilisateur sur une activité (PHIL-U04). */
export async function undoVote(tripId: string, activityId: string): Promise<void> {
  if (!areUuids(tripId, activityId)) {
    return;
  }
  const { supabase, user } = await requireUser();
  await supabase
    .from("activity_votes")
    .delete()
    .eq("activity_id", activityId)
    .eq("user_id", user.id);
  revalidatePath(`/trips/${tripId}/activities`);
}

/** Réinitialise tous les votes de l'utilisateur sur le voyage (PHIL-U04). */
export async function resetMyVotes(tripId: string): Promise<void> {
  if (!areUuids(tripId)) {
    return;
  }
  const { supabase, user } = await requireUser();
  await supabase.from("activity_votes").delete().eq("trip_id", tripId).eq("user_id", user.id);
  revalidatePath(`/trips/${tripId}/activities`);
}

const activitySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().max(120).optional(),
  location: z.string().trim().max(200).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
});

/**
 * Ajoute une activité au pool du voyage (PHIL-U04). RLS
 * `trip_activities_insert_members` (participant + anti-usurpation `created_by`).
 */
export async function addTripActivity(
  _prev: ActivityFormState,
  formData: FormData,
): Promise<ActivityFormState> {
  const t = await getT();
  const tripId = String(formData.get("tripId") ?? "");
  if (!areUuids(tripId)) {
    return { status: "error", message: t("activities.msg.invalid") };
  }
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const parsed = activitySchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    category: formData.get("category") || undefined,
    location: formData.get("location") || undefined,
    tags,
  });
  if (!parsed.success) {
    return { status: "error", message: t("activities.msg.titleRequired") };
  }

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("trip_activities").insert({
    trip_id: tripId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    category: parsed.data.category ?? null,
    location: parsed.data.location ?? null,
    tags: parsed.data.tags,
    source: "manual",
    created_by: user.id,
  });
  if (error) {
    return { status: "error", message: t("activities.msg.addFailed") };
  }
  revalidatePath(`/trips/${tripId}/activities`);
  return { status: "idle" };
}
