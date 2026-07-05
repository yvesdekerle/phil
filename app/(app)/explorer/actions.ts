"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Coche / décoche un pays visité (PHIL-P13). Renvoie false si l'écriture échoue
 * (PHIL-Q57 : permet à la carte de revenir en arrière côté client). */
export async function toggleVisitedCountry(code: string, visited: boolean): Promise<boolean> {
  if (!/^[A-Z0-9]{3}$/.test(code)) {
    return false;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { error } = visited
    ? await supabase.from("visited_countries").upsert({ user_id: user.id, country_code: code })
    : await supabase
        .from("visited_countries")
        .delete()
        .eq("user_id", user.id)
        .eq("country_code", code);
  if (error) {
    return false;
  }
  revalidatePath("/explorer");
  return true;
}
