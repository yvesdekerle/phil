"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";
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

export type MasterWrapDto = {
  wrappedMasterKey: string;
  wrappedMasterIv: string;
  credentialId: string;
  prfSalt: string;
};

/**
 * Renvoie TOUTES les enveloppes PRF de la clé maîtresse (une par appareil
 * enrôlé). Le client les présente ensemble à l'authentificateur, qui ne répond
 * qu'avec la passkey présente sur cet appareil (PHIL-T01, Phase 4a). Liste vide
 * si coffre non activé.
 */
export async function getMyMasterWraps(): Promise<MasterWrapDto[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }
  const { data } = await supabase
    .from("user_master_key_wraps")
    .select("wrapped_key, wrap_iv, credential_id, prf_salt")
    .eq("user_id", user.id)
    .eq("method", "PRF")
    .order("created_at", { ascending: true });
  return (data ?? [])
    .filter((d) => d.credential_id && d.prf_salt)
    .map((d) => ({
      wrappedMasterKey: d.wrapped_key,
      wrappedMasterIv: d.wrap_iv,
      credentialId: d.credential_id as string,
      prfSalt: d.prf_salt as string,
    }));
}

export type RecoveryWrapDto = { wrappedKey: string; wrapIv: string; salt: string };

/**
 * Enveloppe de récupération (code de secours) de l'utilisateur, pour restaurer
 * l'accès sur un nouvel appareil (PHIL-T01, Phase 4a). null si aucun code n'a été
 * configuré. Le code lui-même n'est jamais côté serveur.
 */
export async function getMyRecoveryWrap(): Promise<RecoveryWrapDto | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  const { data } = await supabase
    .from("user_master_key_wraps")
    .select("wrapped_key, wrap_iv, prf_salt")
    .eq("user_id", user.id)
    .eq("method", "RECOVERY")
    .maybeSingle();
  if (!data?.prf_salt) {
    return null;
  }
  return { wrappedKey: data.wrapped_key, wrapIv: data.wrap_iv, salt: data.prf_salt };
}

/** Enveloppe de la clé privée ECDH (déballée côté client via la maîtresse) — pour le partage. */
export async function getMyPrivateKeyWrap(): Promise<{
  wrappedPrivateKey: string;
  wrappedPrivateIv: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  const { data } = await supabase
    .from("user_crypto_keys")
    .select("wrapped_private_key, wrapped_private_iv")
    .eq("user_id", user.id)
    .maybeSingle();
  return data
    ? { wrappedPrivateKey: data.wrapped_private_key, wrappedPrivateIv: data.wrapped_private_iv }
    : null;
}

/** Clé publique ECDH d'un utilisateur (RLS : soi + co-voyageurs) — pour lui partager. */
export async function getUserPublicKey(userId: string): Promise<Json | null> {
  if (!areUuids(userId)) {
    return null;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_crypto_keys")
    .select("public_key")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.public_key ?? null;
}

/**
 * Email d'un utilisateur — pour le filigrane d'un partage. Gardé par la RLS :
 * on ne l'obtient que si on peut voir sa clé publique (soi ou co-voyageur).
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  if (!areUuids(userId)) {
    return null;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  // Gate anti-énumération : la clé publique n'est visible qu'à soi / aux co-voyageurs.
  const { data: allowed } = await supabase
    .from("user_crypto_keys")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!allowed) {
    return null;
  }
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

/**
 * Stocke l'enveloppe de récupération (code de secours) — remplace l'ancienne.
 * PHIL-R21 : remplacement en **delete-then-insert** plutôt qu'`upsert`. La table
 * n'a pas de policy UPDATE (et n'en a pas besoin : une enveloppe ne se modifie
 * jamais en place, elle se remplace) — l'upsert échouait donc silencieusement à
 * la régénération. DELETE + INSERT réutilisent les policies existantes.
 */
export async function storeRecoveryWrap(input: unknown): Promise<StoreResult> {
  const schema = z.object({
    wrappedKey: z.string().min(1),
    wrapIv: z.string().min(1),
    salt: z.string().min(1),
  });
  const parsed = schema.safeParse(input);
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

  const { error: deleteError } = await supabase
    .from("user_master_key_wraps")
    .delete()
    .eq("user_id", user.id)
    .eq("label", "recovery");
  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  const { error } = await supabase.from("user_master_key_wraps").insert({
    user_id: user.id,
    label: "recovery",
    method: "RECOVERY",
    wrapped_key: parsed.data.wrappedKey,
    wrap_iv: parsed.data.wrapIv,
    prf_salt: parsed.data.salt,
    credential_id: null,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/profile");
  return { ok: true };
}

/**
 * Enregistre une enveloppe PRF pour un appareil supplémentaire (restauration
 * Phase 4a, futur ajout par QR) : la maîtresse a été récupérée côté client et
 * ré-emballée par la biométrie de cet appareil. Refuse si le coffre n'est pas
 * activé (garde-fou : on n'enrôle un appareil que sur un coffre existant).
 */
export async function storeDeviceWrap(input: unknown): Promise<StoreResult> {
  const schema = z.object({
    deviceLabel: z.string().min(1).max(80),
    credentialId: z.string().min(1),
    wrappedMasterKey: z.string().min(1),
    wrappedMasterIv: z.string().min(1),
    prfSalt: z.string().min(1),
  });
  const parsed = schema.safeParse(input);
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

  const { data: keys } = await supabase
    .from("user_crypto_keys")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!keys) {
    return { ok: false, error: "not-activated" };
  }

  // Insert simple : le label porte un suffixe aléatoire (unicité garantie côté
  // client) → pas de conflit à gérer, et pas besoin d'une policy UPDATE.
  const m = parsed.data;
  const { error } = await supabase.from("user_master_key_wraps").insert({
    user_id: user.id,
    label: m.deviceLabel,
    method: "PRF",
    wrapped_key: m.wrappedMasterKey,
    wrap_iv: m.wrappedMasterIv,
    prf_salt: m.prfSalt,
    credential_id: m.credentialId,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/profile");
  return { ok: true };
}
