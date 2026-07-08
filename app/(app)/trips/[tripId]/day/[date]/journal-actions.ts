"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";

const entrySchema = z.object({
  tripId: z.string().uuid(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  body: z.string().trim().min(1).max(2000),
});

export type JournalState = { status: "idle" | "error"; message?: string };

/** Écrit (ou réécrit) son entrée de journal du jour (PHIL-P08). */
export async function saveJournalEntry(
  _prev: JournalState,
  formData: FormData,
): Promise<JournalState> {
  const t = await getT();
  const parsed = entrySchema.safeParse({
    tripId: formData.get("tripId"),
    day: formData.get("day"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { status: "error", message: t("calendar.journal.invalidInput") };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { error } = await supabase.from("journal_entries").upsert({
    trip_id: parsed.data.tripId,
    day: parsed.data.day,
    author_id: user.id,
    body: parsed.data.body,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    return { status: "error", message: t("calendar.journal.saveFailed") };
  }
  revalidatePath(`/trips/${parsed.data.tripId}/day/${parsed.data.day}`);
  return { status: "idle" };
}

/** Efface son entrée du jour. */
export async function deleteJournalEntry(tripId: string, day: string): Promise<void> {
  if (!areUuids(tripId) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  await supabase
    .from("journal_entries")
    .delete()
    .eq("trip_id", tripId)
    .eq("day", day)
    .eq("author_id", user.id);
  revalidatePath(`/trips/${tripId}/day/${day}`);
}
