import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Exige un utilisateur connecté (PHIL-Q54) — factorise le boilerplate
 * `createClient()` + `getUser()` + `redirect("/login")` répété dans les
 * server actions. Renvoie le client de session et l'utilisateur (non-null).
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return { supabase, user };
}
