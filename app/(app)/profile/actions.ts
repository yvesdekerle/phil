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

  // En attendant la table `profiles` (PHIL-B01), les préférences vivent
  // dans user_metadata de Supabase Auth.
  const { error } = await supabase.auth.updateUser({
    data: {
      display_name: parsed.data.displayName,
      locale: parsed.data.locale,
      timezone: parsed.data.timezone,
    },
  });

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
