"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { messages, translator } from "@/lib/i18n/messages";
import { getT } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { areUuids } from "@/lib/validation";

export type ParticipantActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const roleSchema = z.enum(["OWNER", "EDITOR", "VIEWER"]);

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

/**
 * Langue de l'invité (par email) pour l'email d'invitation. On résout l'email
 * vers un compte existant via le client admin, puis on lit `profiles.locale`.
 * L'invité peut ne pas encore avoir de compte → repli sur le français.
 */
async function recipientLocaleForEmail(email: string): Promise<Locale> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const target = email.toLowerCase();
    const found = data.users.find((u) => u.email?.toLowerCase() === target);
    if (!found) {
      return "fr";
    }
    const { data: profile } = await admin
      .from("profiles")
      .select("locale")
      .eq("id", found.id)
      .single();
    return isLocale(profile?.locale) ? profile.locale : "fr";
  } catch {
    return "fr";
  }
}

export async function changeParticipantRole(
  tripId: string,
  targetUserId: string,
  newRole: string,
): Promise<ParticipantActionState> {
  const t = await getT();
  const parsed = roleSchema.safeParse(newRole);
  if (!parsed.success) {
    return { status: "error", message: t("participants.msg.roleInvalid") };
  }
  const { supabase, user } = await requireUser();

  if ((await myRole(supabase, tripId, user.id)) !== "OWNER") {
    return { status: "error", message: t("participants.msg.onlyCaptainRole") };
  }
  if (targetUserId === user.id) {
    return { status: "error", message: t("participants.msg.ownRole") };
  }
  if (parsed.data === "OWNER") {
    return {
      status: "error",
      message: t("participants.msg.useTransfer"),
    };
  }

  const { error, count } = await supabase
    .from("trip_participants")
    .update({ role: parsed.data }, { count: "exact" })
    .eq("trip_id", tripId)
    .eq("user_id", targetUserId);

  if (error || count === 0) {
    return { status: "error", message: t("participants.msg.roleChangeFailed") };
  }

  revalidatePath(`/trips/${tripId}/participants`);
  return { status: "success", message: t("participants.msg.roleUpdated") };
}

export async function removeParticipant(
  tripId: string,
  targetUserId: string,
): Promise<ParticipantActionState> {
  const t = await getT();
  const { supabase, user } = await requireUser();

  if ((await myRole(supabase, tripId, user.id)) !== "OWNER") {
    return { status: "error", message: t("participants.msg.onlyCaptainRemove") };
  }
  if (targetUserId === user.id) {
    return { status: "error", message: t("participants.msg.toLeaveUse") };
  }

  const { error, count } = await supabase
    .from("trip_participants")
    .delete({ count: "exact" })
    .eq("trip_id", tripId)
    .eq("user_id", targetUserId);

  if (error || count === 0) {
    return { status: "error", message: t("participants.msg.removeFailed") };
  }

  revalidatePath(`/trips/${tripId}/participants`);
  return { status: "success", message: t("participants.msg.removed") };
}

/**
 * Transfert de propriété : l'autre devient OWNER d'abord (tant que je le suis
 * encore, la RLS m'y autorise), puis je repasse EDITOR.
 */
export async function transferOwnership(
  tripId: string,
  newOwnerId: string,
): Promise<ParticipantActionState> {
  const t = await getT();
  const { supabase, user } = await requireUser();

  if ((await myRole(supabase, tripId, user.id)) !== "OWNER") {
    return { status: "error", message: t("participants.msg.onlyCaptainTransfer") };
  }
  if (newOwnerId === user.id) {
    return { status: "error", message: t("participants.msg.alreadyCaptain") };
  }

  const { error: promoteError, count } = await supabase
    .from("trip_participants")
    .update({ role: "OWNER" }, { count: "exact" })
    .eq("trip_id", tripId)
    .eq("user_id", newOwnerId);

  if (promoteError || count === 0) {
    return { status: "error", message: t("participants.msg.transferFailed") };
  }

  const { error: demoteError } = await supabase
    .from("trip_participants")
    .update({ role: "EDITOR" })
    .eq("trip_id", tripId)
    .eq("user_id", user.id);

  if (demoteError) {
    return {
      status: "error",
      message: t("participants.msg.transferPartial"),
    };
  }

  revalidatePath(`/trips/${tripId}/participants`);
  return { status: "success", message: t("participants.msg.transferred") };
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

  const t = await getT();
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? t("participants.msg.invalidInput"),
    };
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
        ? t("participants.msg.inviteDuplicate")
        : t("participants.msg.inviteFailed"),
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
      // Langue du destinataire (l'invité), pas de l'expéditeur.
      const recipientLocale = await recipientLocaleForEmail(d.email);
      const te = translator(messages[recipientLocale]);
      const inviterName = inviter?.display_name ?? te("email.invitation.inviterFallback");
      const { error: sendError } = await resend.emails.send({
        from: `Phil <${fromEmail()}>`,
        to: d.email,
        subject: te("email.invitation.subject")
          .replace("{name}", inviterName)
          .replace("{trip}", trip.name),
        react: TripInvitationEmail({
          inviterName,
          tripName: trip.name,
          destination: trip.destination,
          dates: formatDateRange(trip.start_date, trip.end_date),
          inviteUrl,
          locale: recipientLocale,
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
      ? t("participants.msg.inviteSentEmail")
      : t("participants.msg.inviteCreatedNoEmail"),
    inviteUrl,
  };
}

export async function cancelInvitation(
  tripId: string,
  invitationId: string,
): Promise<ParticipantActionState> {
  const t = await getT();
  if (!areUuids(tripId, invitationId)) {
    return { status: "error", message: t("participants.msg.invalidIds") };
  }
  const { supabase } = await requireUser();
  const { error, count } = await supabase
    .from("trip_invitations")
    .delete({ count: "exact" })
    .eq("id", invitationId)
    .eq("trip_id", tripId);

  if (error || count === 0) {
    return { status: "error", message: t("participants.msg.cancelFailed") };
  }

  revalidatePath(`/trips/${tripId}/participants`);
  return { status: "success", message: t("participants.msg.canceled") };
}

export async function leaveTrip(tripId: string): Promise<ParticipantActionState> {
  const t = await getT();
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
        message: t("participants.msg.lastCaptain"),
      };
    }
  }

  const { error, count } = await supabase
    .from("trip_participants")
    .delete({ count: "exact" })
    .eq("trip_id", tripId)
    .eq("user_id", user.id);

  if (error || count === 0) {
    return { status: "error", message: t("participants.msg.leaveFailed") };
  }

  redirect("/trips");
}
