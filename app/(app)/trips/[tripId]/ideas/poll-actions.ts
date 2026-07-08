"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import type { ActionState } from "@/lib/forms/action-state";
import { getT } from "@/lib/i18n/server";
import { sendPushToUser } from "@/lib/notifications/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { areUuids } from "@/lib/validation";

const pollSchema = z.object({
  tripId: z.string().uuid(),
  question: z.string().trim().min(1).max(200),
  options: z.array(z.string().trim().min(1).max(80)).min(2).max(5),
  // PHIL-S03 : choix multiple + date de fin optionnelle
  allowMultiple: z.boolean().default(false),
  closesAt: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
});

export type PollState = ActionState;

/** Ouvre un sondage éclair (PHIL-N12) + push à l'équipage. */
export async function createPoll(_prev: PollState, formData: FormData): Promise<PollState> {
  const options = String(formData.get("options") ?? "")
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);
  const parsed = pollSchema.safeParse({
    tripId: formData.get("tripId"),
    question: formData.get("question"),
    options,
    allowMultiple: formData.get("allowMultiple") === "on",
    closesAt: formData.get("closesAt") ?? "",
  });
  const t = await getT();
  if (!parsed.success) {
    return { status: "error", message: t("ideas.pollNeeds") };
  }

  const { supabase, user } = await requireUser();
  const pollId = crypto.randomUUID();
  const { error } = await supabase.from("polls").insert({
    id: pollId,
    trip_id: parsed.data.tripId,
    question: parsed.data.question,
    options: parsed.data.options,
    allow_multiple: parsed.data.allowMultiple,
    // Fin de journée UTC du jour choisi (suffisant pour une échéance de groupe).
    closes_at: parsed.data.closesAt ? `${parsed.data.closesAt}T23:59:59.000Z` : null,
    created_by: user.id,
  });
  if (error) {
    return { status: "error", message: t("ideas.pollCreateFailed") };
  }

  // Push aux autres membres (best effort)
  const admin = createAdminClient();
  const { data: members } = await admin
    .from("trip_participants")
    .select("user_id")
    .eq("trip_id", parsed.data.tripId)
    .neq("user_id", user.id);
  for (const m of members ?? []) {
    await sendPushToUser(m.user_id, {
      title: t("ideas.pollQuick"),
      body: parsed.data.question,
      url: `/trips/${parsed.data.tripId}/polls`,
    });
  }

  revalidatePath(`/trips/${parsed.data.tripId}/polls`);
  return { status: "idle" };
}

export async function votePoll(tripId: string, pollId: string, optionIndex: number): Promise<void> {
  if (!areUuids(tripId, pollId) || !Number.isInteger(optionIndex) || optionIndex < 0) {
    return;
  }
  const { supabase, user } = await requireUser();
  const { data: poll } = await supabase
    .from("polls")
    .select("options, allow_multiple, closed_at, closes_at")
    .eq("id", pollId)
    .single();
  if (!poll) {
    return;
  }
  // PHIL-Q52 : borne haute — un index hors options gonflerait le compteur.
  const options = (poll.options ?? []) as unknown[];
  if (optionIndex >= options.length) {
    return;
  }
  // Sondage clos (manuellement ou échéance dépassée) : plus de vote.
  const past = poll.closes_at ? new Date(poll.closes_at) < new Date() : false;
  if (poll.closed_at !== null || past) {
    return;
  }

  if (poll.allow_multiple) {
    // PHIL-S03 choix multiple : bascule cette option.
    const { data: existing } = await supabase
      .from("poll_votes")
      .select("option_index")
      .eq("poll_id", pollId)
      .eq("user_id", user.id)
      .eq("option_index", optionIndex)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("poll_votes")
        .delete()
        .eq("poll_id", pollId)
        .eq("user_id", user.id)
        .eq("option_index", optionIndex);
    } else {
      await supabase
        .from("poll_votes")
        .insert({ poll_id: pollId, user_id: user.id, option_index: optionIndex });
    }
  } else {
    // Choix simple : remplace le vote précédent.
    await supabase.from("poll_votes").delete().eq("poll_id", pollId).eq("user_id", user.id);
    await supabase
      .from("poll_votes")
      .insert({ poll_id: pollId, user_id: user.id, option_index: optionIndex });
  }
  revalidatePath(`/trips/${tripId}/polls`);
}

/**
 * Édite un sondage (PHIL-S06) : question + libellés d'options. Conserve le
 * MÊME nombre d'options dans le MÊME ordre — les votes (`poll_votes.option_index`)
 * référencent l'index, donc en changer le compte les désaligne. Réservé au
 * créateur/OWNER par la RLS `polls_update_creator_or_owner` (count exact en filet).
 */
export async function editPoll(
  tripId: string,
  pollId: string,
  question: string,
  options: string[],
): Promise<PollState> {
  const t = await getT();
  if (!areUuids(tripId, pollId)) {
    return { status: "error", message: t("ideas.pollEditFailed") };
  }
  const parsed = z
    .object({
      question: z.string().trim().min(1).max(200),
      options: z.array(z.string().trim().min(1).max(80)).min(2).max(5),
    })
    .safeParse({ question, options: options.map((o) => o.trim()).filter(Boolean) });
  if (!parsed.success) {
    return { status: "error", message: t("ideas.pollNeeds") };
  }

  const { supabase } = await requireUser();
  const { data: poll } = await supabase.from("polls").select("options").eq("id", pollId).single();
  if (!poll) {
    return { status: "error", message: t("ideas.pollEditFailed") };
  }
  const currentCount = ((poll.options ?? []) as unknown[]).length;
  if (parsed.data.options.length !== currentCount) {
    return { status: "error", message: t("ideas.pollEditCount") };
  }

  const { error, count } = await supabase
    .from("polls")
    .update({ question: parsed.data.question, options: parsed.data.options }, { count: "exact" })
    .eq("id", pollId);
  if (error || count === 0) {
    return { status: "error", message: t("ideas.pollEditFailed") };
  }
  revalidatePath(`/trips/${tripId}/polls`);
  return { status: "idle" };
}

export async function closePoll(tripId: string, pollId: string): Promise<void> {
  if (!areUuids(tripId, pollId)) {
    return;
  }
  const { supabase } = await requireUser();
  await supabase.from("polls").update({ closed_at: new Date().toISOString() }).eq("id", pollId);
  revalidatePath(`/trips/${tripId}/polls`);
}

/** Supprime un sondage (créateur ou OWNER — RLS `polls_delete_creator_or_owner`). */
export async function deletePoll(tripId: string, pollId: string): Promise<void> {
  if (!areUuids(tripId, pollId)) {
    return;
  }
  const { supabase } = await requireUser();
  await supabase.from("polls").delete().eq("id", pollId);
  revalidatePath(`/trips/${tripId}/polls`);
}
