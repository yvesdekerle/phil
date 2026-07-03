import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { VAULT_SESSION_COOKIE, VAULT_SESSION_MINUTES } from "./config";

/**
 * Session « coffre déverrouillé » (PHIL-C05) : cookie httpOnly signé HMAC,
 * valable 15 minutes. Le secret de signature est dérivé de la service role
 * key (serveur uniquement, jamais exposée telle quelle).
 */
function signingKey(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");
  }
  return createHmac("sha256", "phil-vault-session-v1").update(secret).digest();
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

export async function createVaultSession(userId: string): Promise<void> {
  const expiresAt = Date.now() + VAULT_SESSION_MINUTES * 60_000;
  const payload = `${userId}.${expiresAt}`;
  const value = `${payload}.${sign(payload)}`;

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

  const lastDot = value.lastIndexOf(".");
  if (lastDot < 0) {
    return false;
  }
  const payload = value.slice(0, lastDot);
  const signature = value.slice(lastDot + 1);
  const expected = sign(payload);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }

  const [payloadUserId, expiresAtRaw] = payload.split(".");
  return payloadUserId === userId && Number(expiresAtRaw) > Date.now();
}
