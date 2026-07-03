"use server";

import {
  generateRegistrationOptions,
  type RegistrationResponseJSON,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";
import { CHALLENGE_COOKIE, getRpConfig } from "@/lib/webauthn/config";

export type SecurityActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  return { supabase, user };
}

/** Étape 1 : options d'enregistrement, challenge posé en cookie httpOnly (5 min). */
export async function getRegistrationOptions() {
  const { supabase, user } = await requireUser();
  const { rpName, rpID } = getRpConfig();

  const { data: existing } = await supabase
    .from("user_passkeys")
    .select("credential_id, transports")
    .eq("user_id", user.id);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email ?? user.id,
    userDisplayName: user.email ?? "Voyageur Phil",
    attestationType: "none",
    excludeCredentials: (existing ?? []).map((p) => ({
      id: p.credential_id,
      transports: p.transports as AuthenticatorTransport[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
    },
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

/** Étape 2 : vérification de la réponse et stockage du credential. */
export async function verifyRegistration(
  response: RegistrationResponseJSON,
  deviceName: string,
): Promise<SecurityActionState> {
  const { user } = await requireUser();
  const { rpID, origin } = getRpConfig();

  const cookieStore = await cookies();
  const expectedChallenge = cookieStore.get(CHALLENGE_COOKIE)?.value;
  cookieStore.delete(CHALLENGE_COOKIE);
  if (!expectedChallenge) {
    return { status: "error", message: "Challenge expiré — réessaie." };
  }

  let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch (e) {
    console.error("Vérification WebAuthn échouée:", e);
    return { status: "error", message: "L'enregistrement n'a pas pu être vérifié." };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { status: "error", message: "Enregistrement refusé." };
  }

  const { credential } = verification.registrationInfo;
  const admin = createAdminClient();
  const { error } = await admin.from("user_passkeys").insert({
    user_id: user.id,
    credential_id: credential.id,
    public_key: Buffer.from(credential.publicKey).toString("base64"),
    counter: credential.counter,
    device_name: deviceName.slice(0, 80) || null,
    transports: credential.transports ?? [],
  });

  if (error) {
    return { status: "error", message: "Impossible d'enregistrer la passkey." };
  }

  return { status: "success", message: "Passkey enregistrée — ton coffre a désormais un verrou." };
}

export async function deletePasskey(passkeyId: string): Promise<SecurityActionState> {
  if (!areUuids(passkeyId)) {
    return { status: "error", message: "Identifiant invalide." };
  }
  const { supabase } = await requireUser();
  const { error, count } = await supabase
    .from("user_passkeys")
    .delete({ count: "exact" })
    .eq("id", passkeyId);

  if (error || count === 0) {
    return { status: "error", message: "La révocation a échoué." };
  }
  return { status: "success", message: "Passkey révoquée." };
}
