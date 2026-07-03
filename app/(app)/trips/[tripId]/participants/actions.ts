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

const inviteSchema = z.object({
  tripId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email("Adresse email invalide."),
  role: z.enum(["EDITOR", "VIEWER"]),
});

export type InviteState = {
  status: "idle" | "success" | "error";
  message?: string;
  inviteUrl?: string;
};

export async function createInvitation(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const parsed = inviteSchema.safeParse({
    tripId: formData.get("tripId"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const { supabase, user } = await requireUser();
  const d = parsed.data;

  // Déjà participant ? (comparaison via le profil de l'email impossible côté RLS,
  // on laisse la contrainte unique gérer les doublons d'invitation.)
  const { data: invitation, error } = await supabase
    .from("trip_invitations")
    .insert({
      trip_id: d.tripId,
      invited_email: d.email,
      invited_by: user.id,
      role: d.role,
    })
    .select("token")
    .single();

  if (error || !invitation) {
    return {
      status: "error",
      message: error?.message.includes("duplicate")
        ? "Une invitation est déjà en attente pour cette adresse."
        : "L'invitation a échoué — il faut être capitaine ou éditeur.",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invitations/${invitation.token}`;

  // PHIL-K02 : envoi de l'email d'invitation. Un échec d'envoi (mode test
  // Resend : seules les adresses du compte sont autorisées) n'invalide pas
  // l'invitation — le lien copiable prend le relais.
  let emailSent = false;
  try {
    const [{ data: trip }, { data: inviter }] = await Promise.all([
      supabase
        .from("trips")
        .select("name, destination, start_date, end_date")
        .eq("id", d.tripId)
        .single(),
      supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    ]);

    if (trip) {
      const { createResendClient, fromEmail } = await import("@/lib/email/resend");
      const { TripInvitationEmail } = await import("@/lib/email/templates/trip-invitation");
      const { formatDateRange } = await import("@/lib/trips/format");

      const resend = createResendClient();
      const inviterName = inviter?.display_name ?? "Un compagnon de route";
      const { error: sendError } = await resend.emails.send({
        from: `Phil <${fromEmail()}>`,
        to: d.email,
        subject: `${inviterName} t'invite à rejoindre « ${trip.name} »`,
        react: TripInvitationEmail({
          inviterName,
          tripName: trip.name,
          destination: trip.destination,
          dates: formatDateRange(trip.start_date, trip.end_date),
          inviteUrl,
        }),
      });
      emailSent = !sendError;
      if (sendError) {
        console.error("Envoi invitation échoué:", sendError.message);
      }
    }
  } catch (e) {
    console.error("Envoi invitation impossible:", e);
  }

  revalidatePath(`/trips/${d.tripId}/participants`);
  return {
    status: "success",
    message: emailSent
      ? "Invitation envoyée par email — et voici le lien si besoin."
      : "Invitation créée. L'email n'est pas parti (domaine non vérifié) : partage le lien.",
    inviteUrl,
  };
}

export async function cancelInvitation(
  tripId: string,
  invitationId: string,
): Promise<ParticipantActionState> {
  const { supabase } = await requireUser();
  const { error, count } = await supabase
    .from("trip_invitations")
    .delete({ count: "exact" })
    .eq("id", invitationId)
    .eq("trip_id", tripId);

  if (error || count === 0) {
    return { status: "error", message: "L'annulation a échoué." };
  }

  revalidatePath(`/trips/${tripId}/participants`);
  return { status: "success", message: "Invitation annulée." };
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
