"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";
import type { Json } from "@/types/database";

/**
 * Appariement d'appareils par QR (PHIL-T01, Phase 4c). Relais éphémère : le
 * serveur ne stocke/transmet que du public (clés éphémères ECDH) et du chiffré
 * (maîtresse emballée). Tout est borné à SOI par la RLS — les deux appareils sont
 * le même utilisateur authentifié.
 */

const jwkSchema = z.record(z.string(), z.unknown());

export type CreatePairingResult = { ok: true; pairingId: string } | { ok: false; error: string };

/** Appareil neuf : ouvre un appariement avec sa clé publique éphémère. */
export async function createPairing(newPublicJwk: unknown): Promise<CreatePairingResult> {
  const parsed = jwkSchema.safeParse(newPublicJwk);
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
  // Un seul appariement actif à la fois : on purge les anciens de l'utilisateur.
  await supabase.from("device_pairings").delete().eq("user_id", user.id);

  const { data, error } = await supabase
    .from("device_pairings")
    .insert({ user_id: user.id, new_public_key: parsed.data as Json })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "insert-failed" };
  }
  return { ok: true, pairingId: data.id };
}

export type PairingState = {
  status: string;
  newPublicKey: Json;
  configuredPublicKey: Json | null;
  wrappedMaster: string | null;
  wrapIv: string | null;
};

/** État courant d'un appariement (poll côté neuf, lecture de la publique côté configuré). */
export async function getPairing(pairingId: string): Promise<PairingState | null> {
  if (!areUuids(pairingId)) {
    return null;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  const { data } = await supabase
    .from("device_pairings")
    .select("status, new_public_key, configured_public_key, wrapped_master, wrap_iv, expires_at")
    .eq("id", pairingId)
    .eq("user_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!data) {
    return null;
  }
  return {
    status: data.status,
    newPublicKey: data.new_public_key,
    configuredPublicKey: data.configured_public_key,
    wrappedMaster: data.wrapped_master,
    wrapIv: data.wrap_iv,
  };
}

export type ApproveResult = { ok: true } | { ok: false; error: string };

/** Appareil configuré : dépose la maîtresse emballée + sa publique éphémère. */
export async function approvePairing(pairingId: string, grant: unknown): Promise<ApproveResult> {
  const schema = z.object({
    configuredPublicJwk: jwkSchema,
    wrappedMaster: z.string().min(1),
    iv: z.string().min(1),
  });
  const parsed = schema.safeParse(grant);
  if (!parsed.success || !areUuids(pairingId)) {
    return { ok: false, error: "invalid" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "unauthenticated" };
  }
  const { data, error } = await supabase
    .from("device_pairings")
    .update({
      configured_public_key: parsed.data.configuredPublicJwk as Json,
      wrapped_master: parsed.data.wrappedMaster,
      wrap_iv: parsed.data.iv,
      status: "approved",
    })
    .eq("id", pairingId)
    .eq("user_id", user.id)
    .eq("status", "awaiting")
    .gt("expires_at", new Date().toISOString())
    .select("id")
    .maybeSingle();
  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "not-found-or-expired" };
  }
  return { ok: true };
}

/** Appareil neuf : appariement consommé → suppression (nettoyage du relais). */
export async function consumePairing(pairingId: string): Promise<void> {
  if (!areUuids(pairingId)) {
    return;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return;
  }
  await supabase.from("device_pairings").delete().eq("id", pairingId).eq("user_id", user.id);
}
