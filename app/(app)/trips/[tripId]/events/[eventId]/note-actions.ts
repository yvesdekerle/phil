"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";

const addNoteSchema = z.object({
  tripId: z.string().uuid(),
  eventId: z.string().uuid(),
  body: z.string().trim().min(1).max(1000),
});

export type NoteState = { status: "idle" | "error"; message?: string };

export async function addEventNote(_prev: NoteState, formData: FormData): Promise<NoteState> {
  const parsed = addNoteSchema.safeParse({
    tripId: formData.get("tripId"),
    eventId: formData.get("eventId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Saisie invalide." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("event_notes").insert({
    event_id: parsed.data.eventId,
    author_id: user.id,
    body: parsed.data.body,
  });
  if (error) {
    return { status: "error", message: "Ajout impossible." };
  }
  revalidatePath(`/trips/${parsed.data.tripId}/events/${parsed.data.eventId}`);
  return { status: "idle" };
}

export async function deleteEventNote(
  tripId: string,
  eventId: string,
  noteId: string,
): Promise<void> {
  if (!areUuids(tripId, eventId, noteId)) {
    return;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  await supabase.from("event_notes").delete().eq("id", noteId).eq("event_id", eventId);
  revalidatePath(`/trips/${tripId}/events/${eventId}`);
}
