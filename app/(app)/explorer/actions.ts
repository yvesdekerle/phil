"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Coche / décoche un pays visité (PHIL-P13). */
export async function toggleVisitedCountry(code: string, visited: boolean): Promise<void> {
  if (!/^[A-Z0-9]{3}$/.test(code)) {
    return;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  if (visited) {
    await supabase.from("visited_countries").upsert({ user_id: user.id, country_code: code });
  } else {
    await supabase
      .from("visited_countries")
      .delete()
      .eq("user_id", user.id)
      .eq("country_code", code);
  }
  revalidatePath("/explorer");
}
