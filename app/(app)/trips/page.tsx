import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Stub de la liste des voyages — la vraie page arrive avec PHIL-D01.
 * Sert de destination post-login (PHIL-C01) en attendant.
 */
export default async function TripsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl text-encre">Tes voyages</h1>
      <p className="mt-3 max-w-sm text-sm text-encre-douce">
        Phil prépare ses malles — la liste des voyages arrive bientôt. En attendant, tout est prêt
        pour toi, {user.email}.
      </p>
    </main>
  );
}
