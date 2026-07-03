import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/** Pages publiques exactes. */
const PUBLIC_PATHS = ["/", "/login", "/manifest.webmanifest", "/sw.js", "/offline"];
/** Préfixes publics : callback OAuth, invitations (D06), health check, assets PWA. */
const PUBLIC_PREFIXES = ["/auth/", "/invitations/", "/api/health", "/icons/"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Rafraîchit la session Supabase (cookies) et applique la protection des routes.
 * Appelé par proxy.ts sur chaque requête matchée.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Variables d'environnement Supabase manquantes (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    );
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // Ne rien insérer entre la création du client et getUser() :
  // le refresh de session dépend de cet appel immédiat.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    // Retour sur la page demandée après connexion (sauf appels API).
    if (!pathname.startsWith("/api/")) {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    const tripsUrl = request.nextUrl.clone();
    tripsUrl.pathname = "/trips";
    tripsUrl.search = "";
    return NextResponse.redirect(tripsUrl);
  }

  return supabaseResponse;
}
