"use server";

import {
  type AuthenticationResponseJSON,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { CHALLENGE_COOKIE, getRpConfig } from "@/lib/webauthn/config";
import { createVaultSession } from "@/lib/webauthn/vault-session";

export type UnlockState = {
  status: "idle" | "error";
  message?: string;
};

/** Étape 1 : options d'authentification limitées aux passkeys de l'utilisateur. */
export async function getAuthenticationOptionsAction() {
  const { supabase, user } = await requireUser();
  const { rpID } = getRpConfig();

  const { data: passkeys } = await supabase
    .from("user_passkeys")
    .select("credential_id, transports")
    .eq("user_id", user.id);

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: (passkeys ?? []).map((p) => ({
      id: p.credential_id,
      transports: p.transports as AuthenticatorTransport[],
    })),
  });

  const cookieStore = await cookies();
  cookieStore.set(CHALLENGE_COOKIE, options.challenge, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 300,
    path: "/",
  });

  return options;
}

/** Étape 2 : vérification et ouverture de la session coffre (15 min). */
export async function verifyAuthenticationAction(
  response: AuthenticationResponseJSON,
): Promise<UnlockState> {
  const { supabase, user } = await requireUser();
  const { rpID, origin } = getRpConfig();

  const cookieStore = await cookies();
  const expectedChallenge = cookieStore.get(CHALLENGE_COOKIE)?.value;
  cookieStore.delete(CHALLENGE_COOKIE);
  if (!expectedChallenge) {
    return { status: "error", message: "Challenge expiré — réessaie." };
  }

  const { data: passkey } = await supabase
    .from("user_passkeys")
    .select("id, credential_id, public_key, counter, transports")
    .eq("user_id", user.id)
    .eq("credential_id", response.id)
    .single();

  if (!passkey) {
    return { status: "error", message: "Passkey inconnue pour ce compte." };
  }

  let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: passkey.credential_id,
        publicKey: new Uint8Array(Buffer.from(passkey.public_key, "base64")),
        counter: Number(passkey.counter),
        transports: passkey.transports as AuthenticatorTransport[],
      },
    });
  } catch (e) {
    console.error("Vérification d'authentification échouée:", e);
    return { status: "error", message: "Le déverrouillage n'a pas pu être vérifié." };
  }

  if (!verification.verified) {
    return { status: "error", message: "Déverrouillage refusé." };
  }

  const admin = createAdminClient();
  await admin
    .from("user_passkeys")
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", passkey.id);

  await createVaultSession(user.id);
  return { status: "idle" };
}
