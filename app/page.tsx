import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Racine (PHIL-Q07) : connecté → ses voyages, sinon → login. */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/trips" : "/login");
}
