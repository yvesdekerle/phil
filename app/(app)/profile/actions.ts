"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Il faut bien un nom sur le carnet de bord.")
    .max(80, "80 caractères maximum."),
  locale: z.enum(["fr", "en"]),
  timezone: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz), {
    message: "Fuseau horaire inconnu.",
  }),
  whatsapp: z
    .string()
    .trim()
    .max(50)
    .regex(/^$|^\+?[\d\s.\-()]{6,20}$|^@?[\w.]{3,32}$/, "Un numéro (+33 6…) ou un @pseudo."),
});

export type ProfileFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    locale: formData.get("locale"),
    timezone: formData.get("timezone"),
    whatsapp: formData.get("whatsapp") ?? "",
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      locale: parsed.data.locale,
      timezone: parsed.data.timezone,
      whatsapp: parsed.data.whatsapp || null,
    })
    .eq("id", user.id);

  if (error) {
    return { status: "error", message: "L'enregistrement a échoué. Réessaie dans un instant." };
  }

  revalidatePath("/profile");
  return { status: "success", message: "C'est noté dans le carnet." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Préférences de notification (PHIL-K04). */
export async function updateNotificationPreferences(raw: unknown): Promise<ProfileFormState> {
  const { notificationPreferencesSchema } = await import("@/lib/notifications/preferences");
  const parsed = notificationPreferencesSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Préférences invalides." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ notification_preferences: parsed.data })
    .eq("id", user.id);

  if (error) {
    return { status: "error", message: "Enregistrement impossible." };
  }
  revalidatePath("/profile");
  return { status: "success" };
}

/** Suppression de compte RGPD (PHIL-C06) — confirmation forte côté client. */
export async function deleteMyAccount(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  if (formData.get("confirmation") !== "SUPPRIMER") {
    return { status: "error", message: "Écris SUPPRIMER pour confirmer." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { deleteAccount } = await import("@/lib/account/deletion");
  const { logger } = await import("@/lib/observability/logger");
  try {
    // PHIL-Q52 : supprimer D'ABORD, se déconnecter ensuite. Sinon un échec de
    // suppression laisse l'utilisateur déconnecté avec un compte toujours vivant.
    await deleteAccount(user.id);
    await supabase.auth.signOut();
  } catch (_e) {
    logger.error("account_deletion_failed", { userId: user.id });
    return {
      status: "error",
      message: "La suppression a échoué — contacte yves.dekerle@gmail.com.",
    };
  }

  redirect("/");
}
