import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-6xl text-encre">Phil</h1>
      <p className="mt-4 text-lg text-encre-douce">
        Ton compagnon de voyage, bientôt prêt à partir.
      </p>
      {user ? (
        <Link
          href="/trips"
          className="mt-8 text-sm text-bordeaux underline underline-offset-4 hover:text-bordeaux-fonce"
        >
          Continuer vers tes voyages
        </Link>
      ) : (
        <Link
          href="/login"
          className="mt-8 text-sm text-bordeaux underline underline-offset-4 hover:text-bordeaux-fonce"
        >
          Embarquer
        </Link>
      )}
    </main>
  );
}
