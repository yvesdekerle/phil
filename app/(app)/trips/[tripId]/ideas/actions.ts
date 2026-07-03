"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";

/**
 * Ajoute ou retire ma voix sur une idée (PHIL-H03).
 * La PK (idea_id, user_id) + les policies RLS garantissent une voix max
 * par participant, et le retrait de sa propre voix uniquement.
 */
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

export async function toggleVote(tripId: string, ideaId: string): Promise<void> {
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

  const { data: existing } = await supabase
    .from("idea_votes")
    .select("idea_id")
    .eq("idea_id", ideaId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("idea_votes").delete().eq("idea_id", ideaId).eq("user_id", user.id);
  } else {
    await supabase.from("idea_votes").insert({ idea_id: ideaId, user_id: user.id });
  }

  revalidatePath(`/trips/${tripId}/ideas`);
}
