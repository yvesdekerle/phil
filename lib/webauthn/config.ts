/** Configuration WebAuthn (PHIL-C04/C05) dérivée de l'URL de l'app. */
export function getRpConfig() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = new URL(appUrl);
  return {
    rpName: "Phil — Carnet de voyage",
    rpID: url.hostname,
    origin: url.origin,
  };
}

export const CHALLENGE_COOKIE = "phil_webauthn_challenge";
export const VAULT_SESSION_COOKIE = "phil_vault_session";
export const VAULT_SESSION_MINUTES = 15;
