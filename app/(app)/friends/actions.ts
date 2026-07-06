"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { messages, translator } from "@/lib/i18n/messages";
import { getT } from "@/lib/i18n/server";
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
  const t = await getT();
  if (!areUuids(friendUserId, tripId)) {
    return { status: "error", message: t("friends.msg.invalidIds") };
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
    return { status: "error", message: t("friends.msg.alreadyAboard") };
  }

  // L'email vit dans auth.users : lecture via service role (ami = co-voyageur).
  const admin = createAdminClient();
  const { data: friend } = await admin.auth.admin.getUserById(friendUserId);
  const email = friend.user?.email;
  if (!email) {
    return { status: "error", message: t("friends.msg.noAddress") };
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
        ? t("friends.msg.inviteDuplicate")
        : t("friends.msg.inviteFailed"),
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
      // Langue du destinataire (l'ami ré-invité), pas de l'expéditeur.
      const { data: friendProfile } = await admin
        .from("profiles")
        .select("locale")
        .eq("id", friendUserId)
        .single();
      const recipientLocale: Locale = isLocale(friendProfile?.locale) ? friendProfile.locale : "fr";
      const te = translator(messages[recipientLocale]);
      const inviterName = me?.display_name ?? te("email.invitation.inviterFallback");
      const { error: sendError } = await resend.emails.send({
        from: `Phil <${fromEmail()}>`,
        to: email,
        subject: te("email.invitation.subject")
          .replace("{name}", inviterName)
          .replace("{trip}", trip.name),
        react: TripInvitationEmail({
          inviterName,
          tripName: trip.name,
          destination: trip.destination,
          dates: formatDateRange(trip.start_date, trip.end_date),
          inviteUrl: `${baseUrl}/invitations/${invitation.token}`,
          locale: recipientLocale,
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
    message: emailSent ? t("friends.msg.inviteSentEmail") : t("friends.msg.inviteCreated"),
  };
}
