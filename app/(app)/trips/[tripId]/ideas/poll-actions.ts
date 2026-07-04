"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sendPushToUser } from "@/lib/notifications/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";

const pollSchema = z.object({
  tripId: z.string().uuid(),
  question: z.string().trim().min(1).max(200),
  options: z.array(z.string().trim().min(1).max(80)).min(2).max(5),
});

export type PollState = { status: "idle" | "error"; message?: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return { supabase, user };
}

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
  });
  if (!parsed.success) {
    return { status: "error", message: "Il faut une question et 2 à 5 options." };
  }

  const { supabase, user } = await requireUser();
  const pollId = crypto.randomUUID();
  const { error } = await supabase.from("polls").insert({
    id: pollId,
    trip_id: parsed.data.tripId,
    question: parsed.data.question,
    options: parsed.data.options,
    created_by: user.id,
  });
  if (error) {
    return { status: "error", message: "Création impossible." };
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
      title: "Sondage éclair",
      body: parsed.data.question,
      url: `/trips/${parsed.data.tripId}/ideas`,
    });
  }

  revalidatePath(`/trips/${parsed.data.tripId}/ideas`);
  return { status: "idle" };
}

export async function votePoll(tripId: string, pollId: string, optionIndex: number): Promise<void> {
  if (!areUuids(tripId, pollId) || !Number.isInteger(optionIndex) || optionIndex < 0) {
    return;
  }
  const { supabase, user } = await requireUser();
  await supabase
    .from("poll_votes")
    .upsert(
      { poll_id: pollId, user_id: user.id, option_index: optionIndex },
      { onConflict: "poll_id,user_id" },
    );
  revalidatePath(`/trips/${tripId}/ideas`);
}

export async function closePoll(tripId: string, pollId: string): Promise<void> {
  if (!areUuids(tripId, pollId)) {
    return;
  }
  const { supabase } = await requireUser();
  await supabase.from("polls").update({ closed_at: new Date().toISOString() }).eq("id", pollId);
  revalidatePath(`/trips/${tripId}/ideas`);
}
