import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback OAuth (PHIL-A04) : échange le code PKCE contre une session
 * puis redirige. La destination vient du cookie `phil_next` posé au login
 * (pas d'un query param : il ferait sortir la callback de la liste blanche
 * Supabase). En cas d'échec, retour au login avec un indicateur d'erreur.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const cookieStore = await cookies();
  const rawNext = cookieStore.get("phil_next")?.value;
  cookieStore.delete("phil_next");
  const decoded = rawNext ? decodeURIComponent(rawNext) : "/";
  // Anti open-redirect : uniquement des chemins internes.
  const next = decoded.startsWith("/") && !decoded.startsWith("//") ? decoded : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
