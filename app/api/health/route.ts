import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Vérifie la connectivité avec Supabase (PHIL-A03).
 * Interroge l'endpoint de santé de l'API Auth avec la clé anon publique.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      { status: "error", message: "Variables d'environnement Supabase manquantes" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: "error", message: `Supabase a répondu ${response.status}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ status: "ok", supabase: "reachable" });
  } catch {
    return NextResponse.json({ status: "error", message: "Supabase injoignable" }, { status: 502 });
  }
}
