"use server";

import { fromZonedTime } from "date-fns-tz";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/forms/action-state";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export type QuickAddState = ActionState;

/**
 * Ajout rapide (PHIL-Q01) : titre + jour (+ heure, défaut 12h) → ACTIVITY
 * dans le fuseau du voyage, à enrichir ensuite via la fiche. Le geste le
 * plus fréquent de l'app devient le plus court.
 */
export async function quickAddEvent(
  _prev: QuickAddState,
  formData: FormData,
): Promise<QuickAddState> {
  const t = await getT();
  const quickAddSchema = z.object({
    tripId: z.string().uuid(),
    title: z.string().trim().min(1, t("calendar.quickAdd.errTitle")).max(150),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t("calendar.quickAdd.errDate")),
    time: z.union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/)]).optional(),
  });
  const parsed = quickAddSchema.safeParse({
    tripId: formData.get("tripId"),
    title: formData.get("title"),
    date: formData.get("date"),
    time: formData.get("time") ?? "",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? t("calendar.quickAdd.errInvalid"),
    };
  }
  const d = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("default_timezone")
    .eq("id", d.tripId)
    .single();
  if (!trip) {
    return { status: "error", message: "Voyage introuvable." };
  }

  const { error } = await supabase.from("trip_events").insert({
    id: crypto.randomUUID(),
    trip_id: d.tripId,
    type: "ACTIVITY",
    title: d.title,
    starts_at: fromZonedTime(`${d.date}T${d.time || "12:00"}`, trip.default_timezone).toISOString(),
    timezone: trip.default_timezone,
    metadata: {},
    created_by: user.id,
  });
  if (error) {
    return {
      status: "error",
      message: "L'ajout a échoué — il faut être capitaine ou éditeur du voyage.",
    };
  }

  revalidatePath(`/trips/${d.tripId}`);
  return { status: "idle" };
}
