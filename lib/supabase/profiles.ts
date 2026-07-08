import type { SupabaseClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/auth/session";
import type { Database } from "@/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Récupère le profil du user courant. Filtre explicite sur l'id : depuis
 * PHIL-D08, la RLS expose aussi les profils des co-voyageurs — un `.single()`
 * sans filtre verrait plusieurs lignes et échouerait.
 */
export async function getOwnProfile(supabase: SupabaseClient<Database>): Promise<Profile | null> {
  // PHIL-R19 : user mémoïsé par requête (dédup des appels auth.getUser()).
  const user = await getSessionUser();
  if (!user) {
    return null;
  }
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error) {
    return null;
  }
  return data;
}
