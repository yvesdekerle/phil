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
