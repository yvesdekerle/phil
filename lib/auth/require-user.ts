import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "./session";

/**
 * Exige un utilisateur connecté (PHIL-Q54) — factorise le boilerplate
 * `createClient()` + `getUser()` + `redirect("/login")` répété dans les
 * server actions. Renvoie le client de session et l'utilisateur (non-null).
 * `getUser` passe par `getSessionUser` (mémoïsé par requête, PHIL-R19).
 */
export async function requireUser() {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return { supabase, user };
}
