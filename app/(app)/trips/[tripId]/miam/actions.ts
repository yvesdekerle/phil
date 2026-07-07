"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { getT } from "@/lib/i18n/server";
import { areUuids } from "@/lib/validation";
import { MEAL_SLOTS } from "./meal-constants";

export type MiamState = { status: "idle" | "error"; message?: string };

const mealSchema = z.object({
  tripId: z.string().uuid(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(MEAL_SLOTS),
  title: z.string().trim().min(1).max(200),
  cookId: z.union([z.literal(""), z.string().uuid()]).optional(),
  notes: z.string().trim().max(500).optional(),
});

const shoppingSchema = z.object({
  tripId: z.string().uuid(),
  label: z.string().trim().min(1).max(200),
  quantity: z.string().trim().max(40).optional(),
});

/** PHIL-S01 : planifie un repas (qui cuisine quoi et quand). */
export async function addMeal(_prev: MiamState, formData: FormData): Promise<MiamState> {
  const parsed = mealSchema.safeParse({
    tripId: formData.get("tripId"),
    day: formData.get("day"),
    slot: formData.get("slot"),
    title: formData.get("title"),
    cookId: formData.get("cookId") ?? "",
    notes: formData.get("notes") ?? "",
  });
  const t = await getT();
  if (!parsed.success) {
    return { status: "error", message: t("miam.invalidInput") };
  }
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("trip_meals").insert({
    trip_id: parsed.data.tripId,
    day: parsed.data.day,
    slot: parsed.data.slot,
    title: parsed.data.title,
    cook_id: parsed.data.cookId || null,
    notes: parsed.data.notes || null,
    created_by: user.id,
  });
  if (error) {
    return { status: "error", message: t("miam.addFailed") };
  }
  revalidatePath(`/trips/${parsed.data.tripId}/miam`);
  return { status: "idle" };
}

export async function deleteMeal(tripId: string, mealId: string): Promise<void> {
  if (!areUuids(tripId, mealId)) {
    return;
  }
  const { supabase } = await requireUser();
  await supabase.from("trip_meals").delete().eq("id", mealId).eq("trip_id", tripId);
  revalidatePath(`/trips/${tripId}/miam`);
}

/** PHIL-S01 : ajoute un article à la liste de courses partagée. */
export async function addShoppingItem(_prev: MiamState, formData: FormData): Promise<MiamState> {
  const parsed = shoppingSchema.safeParse({
    tripId: formData.get("tripId"),
    label: formData.get("label"),
    quantity: formData.get("quantity") ?? "",
  });
  const t = await getT();
  if (!parsed.success) {
    return { status: "error", message: t("miam.invalidInput") };
  }
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("shopping_items").insert({
    trip_id: parsed.data.tripId,
    label: parsed.data.label,
    quantity: parsed.data.quantity || null,
    created_by: user.id,
  });
  if (error) {
    return { status: "error", message: t("miam.addFailed") };
  }
  revalidatePath(`/trips/${parsed.data.tripId}/miam`);
  return { status: "idle" };
}

export async function toggleShoppingItem(
  tripId: string,
  itemId: string,
  checked: boolean,
): Promise<void> {
  if (!areUuids(tripId, itemId)) {
    return;
  }
  const { supabase, user } = await requireUser();
  await supabase
    .from("shopping_items")
    .update({ checked, checked_by: checked ? user.id : null })
    .eq("id", itemId)
    .eq("trip_id", tripId);
  revalidatePath(`/trips/${tripId}/miam`);
}

export async function deleteShoppingItem(tripId: string, itemId: string): Promise<void> {
  if (!areUuids(tripId, itemId)) {
    return;
  }
  const { supabase } = await requireUser();
  await supabase.from("shopping_items").delete().eq("id", itemId).eq("trip_id", tripId);
  revalidatePath(`/trips/${tripId}/miam`);
}
