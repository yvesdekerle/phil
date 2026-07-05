"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Choisir "sa maison" depuis la page Horloges (PHIL-Q40) — met à jour le
 * fuseau du profil (source unique : horloge de référence + fuseau par défaut).
 */
export async function setHomeTimezone(timezone: string): Promise<void> {
  // Fuseau IANA valide uniquement
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: timezone });
  } catch {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  await supabase.from("profiles").update({ timezone }).eq("id", user.id);
  revalidatePath("/horloges");
}
