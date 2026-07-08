import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Utilisateur de session, **mémoïsé par requête** (PHIL-R19, `React.cache`).
 * Déduplique l'appel réseau `auth.getUser()` : sur une page voyage, le layout
 * app (profil), le layout voyage et la page le demandent chacun — sans ce cache,
 * autant d'allers-retours GoTrue. Le cache est vidé à chaque requête serveur.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
