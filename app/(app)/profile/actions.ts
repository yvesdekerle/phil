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
  try {
    await supabase.auth.signOut();
    await deleteAccount(user.id);
  } catch (e) {
    console.error("Suppression de compte échouée:", e);
    return {
      status: "error",
      message: "La suppression a échoué — contacte yves.dekerle@gmail.com.",
    };
  }

  redirect("/");
}
