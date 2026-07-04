"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";

export const SECTIONS = ["avant_depart", "a_emporter", "sur_place"] as const;
export type ChecklistSection = (typeof SECTIONS)[number];

const addSchema = z.object({
  tripId: z.string().uuid(),
  section: z.enum(SECTIONS),
  title: z.string().trim().min(1).max(200),
  // PHIL-O05 : item rattaché à un événement ("à emporter pour cette activité")
  eventId: z.union([z.literal(""), z.string().uuid()]).optional(),
});

export type ChecklistState = { status: "idle" | "error"; message?: string };

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

export async function addChecklistItem(
  _prev: ChecklistState,
  formData: FormData,
): Promise<ChecklistState> {
  const parsed = addSchema.safeParse({
    tripId: formData.get("tripId"),
    section: formData.get("section"),
    title: formData.get("title"),
    eventId: formData.get("eventId") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: "Saisie invalide." };
  }
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("checklist_items").insert({
    trip_id: parsed.data.tripId,
    section: parsed.data.section,
    title: parsed.data.title,
    event_id: parsed.data.eventId || null,
    created_by: user.id,
  });
  if (error) {
    return { status: "error", message: "Ajout impossible." };
  }
  revalidatePath(`/trips/${parsed.data.tripId}/checklist`);
  if (parsed.data.eventId) {
    revalidatePath(`/trips/${parsed.data.tripId}/events/${parsed.data.eventId}`);
  }
  return { status: "idle" };
}

export async function toggleChecklistItem(
  tripId: string,
  itemId: string,
  done: boolean,
  eventId?: string,
): Promise<void> {
  if (!areUuids(tripId, itemId) || (eventId !== undefined && !areUuids(eventId))) {
    return;
  }
  const { supabase } = await requireUser();
  await supabase.from("checklist_items").update({ done }).eq("id", itemId).eq("trip_id", tripId);
  revalidatePath(`/trips/${tripId}/checklist`);
  if (eventId) {
    revalidatePath(`/trips/${tripId}/events/${eventId}`);
  }
}

export async function assignChecklistItem(
  tripId: string,
  itemId: string,
  userId: string | null,
): Promise<void> {
  if (!areUuids(tripId, itemId) || (userId !== null && !areUuids(userId))) {
    return;
  }
  const { supabase } = await requireUser();
  await supabase
    .from("checklist_items")
    .update({ assigned_to: userId })
    .eq("id", itemId)
    .eq("trip_id", tripId);
  revalidatePath(`/trips/${tripId}/checklist`);
}

export async function deleteChecklistItem(
  tripId: string,
  itemId: string,
  eventId?: string,
): Promise<void> {
  if (!areUuids(tripId, itemId) || (eventId !== undefined && !areUuids(eventId))) {
    return;
  }
  const { supabase } = await requireUser();
  await supabase.from("checklist_items").delete().eq("id", itemId).eq("trip_id", tripId);
  revalidatePath(`/trips/${tripId}/checklist`);
  if (eventId) {
    revalidatePath(`/trips/${tripId}/events/${eventId}`);
  }
}
