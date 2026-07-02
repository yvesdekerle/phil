import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase côté navigateur (composants client).
 * N'utilise que des variables publiques — jamais la service role key ici.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Variables d'environnement Supabase manquantes (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    );
  }

  return createBrowserClient(url, anonKey);
}
