import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <h1 className="text-4xl font-bold tracking-tight">Phil</h1>
      <p className="mt-4 text-lg text-zinc-500">Ton compagnon de voyage, bientôt prêt à partir.</p>
      {user ? (
        <p className="mt-8 text-sm text-zinc-600">
          Connecté : <span className="font-medium">{user.email}</span>
        </p>
      ) : (
        <Link href="/login" className="mt-8 text-sm text-zinc-600 underline underline-offset-4">
          Se connecter
        </Link>
      )}
    </div>
  );
}
