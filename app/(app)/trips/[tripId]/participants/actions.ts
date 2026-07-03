"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ParticipantActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const roleSchema = z.enum(["OWNER", "EDITOR", "VIEWER"]);

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

async function myRole(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  tripId: string,
  userId: string,
) {
  const { data } = await supabase
    .from("trip_participants")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .single();
  return data?.role ?? null;
}

export async function changeParticipantRole(
  tripId: string,
  targetUserId: string,
  newRole: string,
): Promise<ParticipantActionState> {
  const parsed = roleSchema.safeParse(newRole);
  if (!parsed.success) {
    return { status: "error", message: "Rôle invalide." };
  }
  const { supabase, user } = await requireUser();

  if ((await myRole(supabase, tripId, user.id)) !== "OWNER") {
    return { status: "error", message: "Seul le capitaine peut changer les rôles." };
  }
  if (targetUserId === user.id) {
    return { status: "error", message: "Pour changer ton propre rôle, transfère la propriété." };
  }
  if (parsed.data === "OWNER") {
    return {
      status: "error",
      message: "Utilise le transfert de propriété pour nommer un capitaine.",
    };
  }

  const { error, count } = await supabase
    .from("trip_participants")
    .update({ role: parsed.data }, { count: "exact" })
    .eq("trip_id", tripId)
    .eq("user_id", targetUserId);

  if (error || count === 0) {
    return { status: "error", message: "Le changement de rôle a échoué." };
  }

  revalidatePath(`/trips/${tripId}/participants`);
  return { status: "success", message: "Rôle mis à jour." };
}

export async function removeParticipant(
  tripId: string,
  targetUserId: string,
): Promise<ParticipantActionState> {
  const { supabase, user } = await requireUser();

  if ((await myRole(supabase, tripId, user.id)) !== "OWNER") {
    return { status: "error", message: "Seul le capitaine peut débarquer un voyageur." };
  }
  if (targetUserId === user.id) {
    return { status: "error", message: "Pour partir, utilise « Quitter le voyage »." };
  }

  const { error, count } = await supabase
    .from("trip_participants")
    .delete({ count: "exact" })
    .eq("trip_id", tripId)
    .eq("user_id", targetUserId);

  if (error || count === 0) {
    return { status: "error", message: "Le retrait a échoué." };
  }

  revalidatePath(`/trips/${tripId}/participants`);
  return { status: "success", message: "Voyageur débarqué." };
}

/**
 * Transfert de propriété : l'autre devient OWNER d'abord (tant que je le suis
 * encore, la RLS m'y autorise), puis je repasse EDITOR.
 */
export async function transferOwnership(
  tripId: string,
  newOwnerId: string,
): Promise<ParticipantActionState> {
  const { supabase, user } = await requireUser();

  if ((await myRole(supabase, tripId, user.id)) !== "OWNER") {
    return { status: "error", message: "Seul le capitaine peut transmettre la barre." };
  }
  if (newOwnerId === user.id) {
    return { status: "error", message: "Tu es déjà capitaine." };
  }

  const { error: promoteError, count } = await supabase
    .from("trip_participants")
    .update({ role: "OWNER" }, { count: "exact" })
    .eq("trip_id", tripId)
    .eq("user_id", newOwnerId);

  if (promoteError || count === 0) {
    return { status: "error", message: "Le transfert a échoué." };
  }

  const { error: demoteError } = await supabase
    .from("trip_participants")
    .update({ role: "EDITOR" })
    .eq("trip_id", tripId)
    .eq("user_id", user.id);

  if (demoteError) {
    return {
      status: "error",
      message: "Transfert partiel : vous êtes deux capitaines, réessaie de repasser éditeur.",
    };
  }

  revalidatePath(`/trips/${tripId}/participants`);
  return { status: "success", message: "La barre est transmise." };
}

export async function leaveTrip(tripId: string): Promise<ParticipantActionState> {
  const { supabase, user } = await requireUser();

  const role = await myRole(supabase, tripId, user.id);
  if (role === "OWNER") {
    const { data: owners } = await supabase
      .from("trip_participants")
      .select("user_id")
      .eq("trip_id", tripId)
      .eq("role", "OWNER");
    if ((owners ?? []).length <= 1) {
      return {
        status: "error",
        message: "Dernier capitaine à bord : transfère la propriété avant de partir.",
      };
    }
  }

  const { error, count } = await supabase
    .from("trip_participants")
    .delete({ count: "exact" })
    .eq("trip_id", tripId)
    .eq("user_id", user.id);

  if (error || count === 0) {
    return { status: "error", message: "Le départ a échoué." };
  }

  redirect("/trips");
}
