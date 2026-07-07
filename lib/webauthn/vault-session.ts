import "server-only";
import { cookies } from "next/headers";
import { VAULT_SESSION_COOKIE, VAULT_SESSION_MINUTES } from "./config";
import { buildSessionToken, deriveSigningKey, parseSessionToken } from "./vault-session-token";

/**
 * Session « coffre déverrouillé » (PHIL-C05) : cookie httpOnly signé HMAC,
 * valable 15 minutes. Le secret de signature est dérivé de la service role
 * key (serveur uniquement, jamais exposée telle quelle). La logique HMAC pure
 * vit dans `vault-session-token.ts` (testable, sans `next/headers`).
 */
function signingKey(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");
  }
  return deriveSigningKey(secret);
}

export async function createVaultSession(userId: string): Promise<void> {
  const expiresAt = Date.now() + VAULT_SESSION_MINUTES * 60_000;
  const value = buildSessionToken(userId, expiresAt, signingKey());

  const cookieStore = await cookies();
  cookieStore.set(VAULT_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: VAULT_SESSION_MINUTES * 60,
    path: "/",
  });
}

export async function isVaultUnlocked(userId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const value = cookieStore.get(VAULT_SESSION_COOKIE)?.value;
  if (!value) {
    return false;
  }

  const parsed = parseSessionToken(value, signingKey());
  return parsed.valid && parsed.userId === userId && parsed.expiresAt > Date.now();
}
