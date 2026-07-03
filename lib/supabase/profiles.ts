import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Récupère le profil du user courant (RLS : chacun ne voit que le sien).
 */
export async function getOwnProfile(supabase: SupabaseClient<Database>): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").single();
  if (error) {
    return null;
  }
  return data;
}
