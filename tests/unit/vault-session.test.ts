import { describe, expect, it } from "vitest";
import {
  buildSessionToken,
  deriveSigningKey,
  parseSessionToken,
  signPayload,
} from "@/lib/webauthn/vault-session-token";

const SECRET = "service-role-key-de-test-aaaaaaaaaaaaaaaa";
const KEY = deriveSigningKey(SECRET);
const USER = "11111111-2222-3333-4444-555555555555";

/**
 * Reproduit la décision de `isVaultUnlocked` (userId attendu + non expiré) sur
 * la logique pure, pour tester la sémantique sans `next/headers`.
 */
function isUnlocked(token: string, userId: string, now: number): boolean {
  const parsed = parseSessionToken(token, KEY);
  return parsed.valid && parsed.userId === userId && parsed.expiresAt > now;
}

describe("vault-session-token — dérivation de la clé", () => {
  it("dérive une clé HMAC-SHA256 de 32 octets, déterministe", () => {
    const a = deriveSigningKey(SECRET);
    const b = deriveSigningKey(SECRET);
    expect(a.length).toBe(32);
    expect(a.equals(b)).toBe(true);
  });

  it("un secret différent produit une clé différente", () => {
    expect(deriveSigningKey(SECRET).equals(deriveSigningKey(`${SECRET}x`))).toBe(false);
  });
});

describe("vault-session-token — signature et vérification", () => {
  it("round-trip : un jeton fraîchement construit est valide et rend le payload", () => {
    const expiresAt = 1_800_000_000_000;
    const token = buildSessionToken(USER, expiresAt, KEY);
    const parsed = parseSessionToken(token, KEY);
    expect(parsed).toEqual({ valid: true, userId: USER, expiresAt });
  });

  it("refuse un jeton signé avec une autre clé (secret différent)", () => {
    const token = buildSessionToken(USER, 1_800_000_000_000, KEY);
    const otherKey = deriveSigningKey("un-autre-secret-completement-different");
    expect(parseSessionToken(token, otherKey)).toEqual({ valid: false });
  });

  it("refuse un payload altéré (userId réécrit) — la signature ne colle plus", () => {
    const expiresAt = 1_800_000_000_000;
    const token = buildSessionToken(USER, expiresAt, KEY);
    const signature = token.slice(token.lastIndexOf(".") + 1);
    const forged = `attaquant.${expiresAt}.${signature}`;
    expect(parseSessionToken(forged, KEY)).toEqual({ valid: false });
  });

  it("refuse une échéance rallongée sans re-signer (élévation de durée)", () => {
    const token = buildSessionToken(USER, 1_000, KEY);
    const signature = token.slice(token.lastIndexOf(".") + 1);
    const forged = `${USER}.9999999999999.${signature}`;
    expect(parseSessionToken(forged, KEY)).toEqual({ valid: false });
  });

  it("refuse une signature tronquée (longueurs différentes, garde temps constant)", () => {
    const token = buildSessionToken(USER, 1_800_000_000_000, KEY);
    const truncated = token.slice(0, -4);
    expect(parseSessionToken(truncated, KEY)).toEqual({ valid: false });
  });

  it("refuse une signature de même longueur mais fausse", () => {
    const payload = `${USER}.1800000000000`;
    const good = signPayload(payload, KEY);
    // Remplace le dernier caractère par un autre du même alphabet base64url.
    const flip = good.at(-1) === "A" ? "B" : "A";
    const forged = `${payload}.${good.slice(0, -1)}${flip}`;
    expect(parseSessionToken(forged, KEY)).toEqual({ valid: false });
  });

  it("refuse une valeur sans séparateur", () => {
    expect(parseSessionToken("pas-de-point", KEY)).toEqual({ valid: false });
  });

  it("refuse une échéance non numérique malgré une signature valide", () => {
    const payload = `${USER}.jamais`;
    const token = `${payload}.${signPayload(payload, KEY)}`;
    expect(parseSessionToken(token, KEY)).toEqual({ valid: false });
  });
});

describe("vault-session-token — sémantique de déverrouillage", () => {
  it("déverrouille pour le bon user tant que l'échéance n'est pas passée", () => {
    const now = 1_800_000_000_000;
    const token = buildSessionToken(USER, now + 60_000, KEY);
    expect(isUnlocked(token, USER, now)).toBe(true);
  });

  it("refuse un jeton expiré (échéance dépassée)", () => {
    const now = 1_800_000_000_000;
    const token = buildSessionToken(USER, now - 1, KEY);
    expect(isUnlocked(token, USER, now)).toBe(false);
  });

  it("refuse un jeton valide mais émis pour un autre utilisateur", () => {
    const now = 1_800_000_000_000;
    const token = buildSessionToken("00000000-0000-0000-0000-000000000000", now + 60_000, KEY);
    expect(isUnlocked(token, USER, now)).toBe(false);
  });
});
