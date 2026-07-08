"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/forms/action-state";
import { getT } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AcceptState = ActionState;

/**
 * Acceptation d'une invitation (PHIL-D06). L'invité n'étant pas participant,
 * tout passe par le service role après vérification du token :
 * détenteur du lien = invité (lien magique).
 */
export async function acceptInvitation(token: string): Promise<AcceptState> {
  const t = await getT();
  if (!z.string().uuid().safeParse(token).success) {
    return { status: "error", message: t("invitations.msg.invalidLink") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/invitations/${token}`);
  }

  const admin = createAdminClient();
  const { data: invitation } = await admin
    .from("trip_invitations")
    .select("id, trip_id, role, accepted_at, expires_at, invited_email")
    .eq("token", token)
    .single();

  if (!invitation) {
    return { status: "error", message: t("invitations.msg.notFound") };
  }
  if (invitation.accepted_at) {
    return { status: "error", message: t("invitations.msg.alreadyUsed") };
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return { status: "error", message: t("invitations.msg.expired") };
  }
  // Le lien magique doit être consommé par son destinataire : l'invitation est
  // liée à une adresse précise, on refuse un compte connecté qui ne correspond pas.
  if (
    invitation.invited_email &&
    user.email &&
    invitation.invited_email.trim().toLowerCase() !== user.email.trim().toLowerCase()
  ) {
    return { status: "error", message: t("invitations.msg.wrongAccount") };
  }

  const { data: existing } = await admin
    .from("trip_participants")
    .select("user_id")
    .eq("trip_id", invitation.trip_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    redirect(`/trips/${invitation.trip_id}`);
  }

  const { error: insertError } = await admin.from("trip_participants").insert({
    trip_id: invitation.trip_id,
    user_id: user.id,
    role: invitation.role,
  });

  if (insertError) {
    return { status: "error", message: t("invitations.msg.joinFailed") };
  }

  await admin
    .from("trip_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id);

  redirect(`/trips/${invitation.trip_id}`);
}
