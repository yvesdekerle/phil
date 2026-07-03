import { Resend } from "resend";

/**
 * Client Resend — SERVEUR UNIQUEMENT.
 * En dev sans domaine vérifié, RESEND_FROM_EMAIL=onboarding@resend.dev
 * (envois limités à l'adresse du propriétaire du compte).
 */
export function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY manquante");
  }
  return new Resend(apiKey);
}

export function fromEmail(): string {
  return process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
}
