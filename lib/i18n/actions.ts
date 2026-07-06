"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isLocale, LOCALE_COOKIE, type Locale } from "./config";

/**
 * Bascule de langue rapide (PHIL-Q37) — pose le cookie `NEXT_LOCALE` et, si
 * l'utilisateur est connecté, persiste le choix sur son profil (best-effort,
 * pour retrouver sa langue sur un autre appareil).
 */
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;

  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 31_536_000,
    sameSite: "lax",
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("profiles").update({ locale }).eq("id", user.id);
  }
}
