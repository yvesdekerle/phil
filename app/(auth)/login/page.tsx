"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Page de login minimale (PHIL-A04) — l'habillage complet arrive avec PHIL-C01.
 */
export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (signInError) {
      setError("La connexion a échoué. Réessaie dans un instant.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Bienvenue à bord</h1>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading}
        className="rounded-md border border-zinc-300 px-6 py-3 font-medium transition-colors hover:bg-zinc-100 disabled:opacity-50"
      >
        {loading ? "Embarquement…" : "Se connecter avec Google"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
