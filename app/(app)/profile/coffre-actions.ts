"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

// PHIL-T01 Phase 0 — enregistrement des clés du coffre E2EE. Le matériel reçu
// est déjà chiffré/public côté client ; le serveur ne fait que le stocker.
const materialSchema = z.object({
  publicKeyJwk: z.record(z.string(), z.unknown()),
  wrappedPrivateKey: z.string().min(1),
  wrappedPrivateIv: z.string().min(1),
  wrappedMasterKey: z.string().min(1),
  wrappedMasterIv: z.string().min(1),
  credentialId: z.string().min(1),
  prfSalt: z.string().min(1),
  deviceLabel: z.string().min(1).max(80),
});

export type StoreResult = { ok: true } | { ok: false; error: string };

/**
 * Enregistre les clés du coffre. Bloque si déjà activé (garde-fou anti-perte :
 * régénérer écraserait la maîtresse et rendrait d'éventuels docs illisibles).
 */
export async function storeCoffreKeys(input: unknown): Promise<StoreResult> {
  const parsed = materialSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "unauthenticated" };
  }
  const m = parsed.data;

  const { data: existing } = await supabase
    .from("user_crypto_keys")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "already-activated" };
  }

  const { error: keyError } = await supabase.from("user_crypto_keys").insert({
    user_id: user.id,
    public_key: m.publicKeyJwk as Json,
    wrapped_private_key: m.wrappedPrivateKey,
    wrapped_private_iv: m.wrappedPrivateIv,
  });
  if (keyError) {
    return { ok: false, error: keyError.message };
  }

  const { error: wrapError } = await supabase.from("user_master_key_wraps").insert({
    user_id: user.id,
    label: m.deviceLabel,
    method: "PRF",
    wrapped_key: m.wrappedMasterKey,
    wrap_iv: m.wrappedMasterIv,
    credential_id: m.credentialId,
    prf_salt: m.prfSalt,
  });
  if (wrapError) {
    return { ok: false, error: wrapError.message };
  }

  revalidatePath("/profile");
  return { ok: true };
}
