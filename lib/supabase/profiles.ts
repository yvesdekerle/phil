import type { SupabaseClient } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  locale: string;
  timezone: string;
  created_at: string;
  updated_at: string;
};

/**
 * Récupère le profil du user courant (RLS : chacun ne voit que le sien).
 * Typage manuel en attendant la génération types/database.ts (PHIL-B13).
 */
export async function getOwnProfile(supabase: SupabaseClient): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").single();
  if (error) {
    return null;
  }
  return data as Profile;
}
