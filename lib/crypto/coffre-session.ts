"use client";

/**
 * Session coffre (PHIL-T01, Phase 1) — garde la clé maîtresse déverrouillée EN
 * MÉMOIRE pour la session, afin de ne demander Face ID qu'une fois (puis
 * réutiliser pour chiffrer/déchiffrer plusieurs documents).
 *
 * La maîtresse ne quitte jamais la mémoire de l'onglet ; un rechargement complet
 * la vide (il faudra re-déverrouiller). `lockCoffre()` la vide à la demande.
 */

import { getMyMasterWrap, getMyPrivateKeyWrap } from "@/app/(app)/profile/coffre-actions";
import { fromBase64, unwrapPrivateKey } from "./vault-crypto";
import { unlockMaster } from "./vault-keys";

let cachedMaster: CryptoKey | null = null;
let cachedPrivate: CryptoKey | null = null;

/** true si la maîtresse est déjà déverrouillée dans cet onglet. */
export function isCoffreUnlocked(): boolean {
  return cachedMaster !== null;
}

/**
 * Renvoie la maîtresse : depuis le cache mémoire si dispo, sinon déclenche Face ID
 * (récupère l'enveloppe côté serveur puis déverrouille via PRF). Lève si le coffre
 * n'est pas activé.
 */
export async function getCoffreMaster(): Promise<CryptoKey> {
  if (cachedMaster) {
    return cachedMaster;
  }
  const wrap = await getMyMasterWrap();
  if (!wrap) {
    throw new Error("Coffre non activé — active-le d'abord dans ton profil.");
  }
  cachedMaster = await unlockMaster(wrap);
  return cachedMaster;
}

/**
 * Renvoie la clé privée ECDH de l'utilisateur (déballée via la maîtresse, mise
 * en cache) — nécessaire pour partager (dériver la clé partagée avec un
 * destinataire) et pour lire un document qu'on nous a partagé.
 */
export async function getCoffrePrivateKey(): Promise<CryptoKey> {
  if (cachedPrivate) {
    return cachedPrivate;
  }
  const master = await getCoffreMaster();
  const wrap = await getMyPrivateKeyWrap();
  if (!wrap) {
    throw new Error("Coffre non activé — active-le d'abord dans ton profil.");
  }
  cachedPrivate = await unwrapPrivateKey(
    master,
    fromBase64(wrap.wrappedPrivateKey),
    fromBase64(wrap.wrappedPrivateIv),
  );
  return cachedPrivate;
}

/** Oublie la maîtresse et la privée (verrouillage manuel / déconnexion). */
export function lockCoffre(): void {
  cachedMaster = null;
  cachedPrivate = null;
}
