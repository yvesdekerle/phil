import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Logique pure du jeton de session coffre (PHIL-C05, durcissement R13).
 *
 * Extraite de `vault-session.ts` pour être testable sous Vitest : ce module
 * ne dépend ni de `next/headers` ni de `server-only`, seulement de la crypto
 * Node. `vault-session.ts` l'habille avec le cookie httpOnly et l'horloge.
 *
 * Format du jeton : `${userId}.${expiresAt}.${signature}` où la signature est
 * un HMAC-SHA256 base64url du payload `${userId}.${expiresAt}`. Le userId est
 * un UUID et la signature base64url : ni l'un ni l'autre ne contient de `.`,
 * donc le dernier `.` sépare sans ambiguïté payload et signature.
 */

const KEY_DERIVATION_LABEL = "phil-vault-session-v1";

/** Dérive la clé de signature HMAC depuis le secret serveur (service role). */
export function deriveSigningKey(secret: string): Buffer {
  return createHmac("sha256", KEY_DERIVATION_LABEL).update(secret).digest();
}

/** Signe un payload avec la clé dérivée (HMAC-SHA256, base64url). */
export function signPayload(payload: string, key: Buffer): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/** Construit la valeur de cookie signée pour un user et une échéance (ms epoch). */
export function buildSessionToken(userId: string, expiresAt: number, key: Buffer): string {
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${signPayload(payload, key)}`;
}

export type SessionTokenCheck =
  | { valid: false }
  | { valid: true; userId: string; expiresAt: number };

/**
 * Vérifie la signature (comparaison à temps constant) et parse le payload.
 * Ne compare PAS l'échéance à une horloge : l'appelant tranche (déterminisme
 * des tests, une seule lecture de `Date.now()` côté `vault-session.ts`).
 */
export function parseSessionToken(value: string, key: Buffer): SessionTokenCheck {
  const lastDot = value.lastIndexOf(".");
  if (lastDot < 0) {
    return { valid: false };
  }
  const payload = value.slice(0, lastDot);
  const signature = value.slice(lastDot + 1);
  const expected = signPayload(payload, key);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false };
  }

  const [userId, expiresAtRaw] = payload.split(".");
  const expiresAt = Number(expiresAtRaw);
  if (!userId || !Number.isFinite(expiresAt)) {
    return { valid: false };
  }
  return { valid: true, userId, expiresAt };
}
