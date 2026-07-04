"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";

export type InviteFriendState = {
  status: "idle" | "success" | "error";
  message?: string;
};

/**
 * Ré-invitation en un clic (PHIL-D08) : crée une invitation classique
 * (même flux que D05/K02) pour un ancien compagnon de voyage.
 */
export async function inviteFriend(
  friendUserId: string,
  tripId: string,
): Promise<InviteFriendState> {
  if (!areUuids(friendUserId, tripId)) {
    return { status: "error", message: "Identifiants invalides." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Déjà à bord ?
  const { data: existing } = await supabase
    .from("trip_participants")
    .select("user_id")
    .eq("trip_id", tripId)
    .eq("user_id", friendUserId)
    .maybeSingle();
  if (existing) {
    return { status: "error", message: "Déjà à bord de ce voyage." };
  }

  // L'email vit dans auth.users : lecture via service role (ami = co-voyageur).
  const admin = createAdminClient();
  const { data: friend } = await admin.auth.admin.getUserById(friendUserId);
  const email = friend.user?.email;
  if (!email) {
    return { status: "error", message: "Adresse introuvable pour cet ami." };
  }

  // Insert via le client de session : la RLS vérifie mon rôle OWNER/EDITOR.
  const { data: invitation, error } = await supabase
    .from("trip_invitations")
    .insert({ trip_id: tripId, invited_email: email, invited_by: user.id, role: "EDITOR" })
    .select("token")
    .single();

  if (error || !invitation) {
    return {
      status: "error",
      message: error?.message.includes("duplicate")
        ? "Une invitation est déjà en attente pour ce voyage."
        : "L'invitation a échoué.",
    };
  }

  // Envoi email (même logique non bloquante que K02)
  let emailSent = false;
  try {
    const [{ data: trip }, { data: me }] = await Promise.all([
      supabase
        .from("trips")
        .select("name, destination, start_date, end_date")
        .eq("id", tripId)
        .single(),
      supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    ]);
    if (trip) {
      const { createResendClient, fromEmail } = await import("@/lib/email/resend");
      const { TripInvitationEmail } = await import("@/lib/email/templates/trip-invitation");
      const { formatDateRange } = await import("@/lib/trips/format");
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const resend = createResendClient();
      const inviterName = me?.display_name ?? "Un compagnon de route";
      const { error: sendError } = await resend.emails.send({
        from: `Phil <${fromEmail()}>`,
        to: email,
        subject: `${inviterName} t'invite à rejoindre « ${trip.name} »`,
        react: TripInvitationEmail({
          inviterName,
          tripName: trip.name,
          destination: trip.destination,
          dates: formatDateRange(trip.start_date, trip.end_date),
          inviteUrl: `${baseUrl}/invitations/${invitation.token}`,
        }),
      });
      emailSent = !sendError;
    }
  } catch (e) {
    console.error("Envoi ré-invitation impossible:", e);
  }

  revalidatePath(`/trips/${tripId}/participants`);
  return {
    status: "success",
    message: emailSent
      ? "Invitation envoyée par email."
      : "Invitation créée — le lien à partager est dans la liste des invitations.",
  };
}
