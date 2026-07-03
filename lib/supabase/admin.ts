import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Client Supabase service role — SERVEUR UNIQUEMENT.
 * Bypasse la RLS : à réserver aux opérations qui l'exigent
 * (audit log, lecture Storage pour le viewer, nettoyages).
 * Ne jamais importer depuis un composant client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Variables d'environnement Supabase service role manquantes");
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
