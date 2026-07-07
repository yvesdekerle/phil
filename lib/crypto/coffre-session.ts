"use client";

/**
 * Session coffre (PHIL-T01, Phase 1) — garde la clé maîtresse déverrouillée EN
 * MÉMOIRE pour la session, afin de ne demander Face ID qu'une fois (puis
 * réutiliser pour chiffrer/déchiffrer plusieurs documents).
 *
 * La maîtresse ne quitte jamais la mémoire de l'onglet ; un rechargement complet
 * la vide (il faudra re-déverrouiller). `lockCoffre()` la vide à la demande.
 */

import { getMyMasterWrap } from "@/app/(app)/profile/coffre-actions";
import { unlockMaster } from "./vault-keys";

let cachedMaster: CryptoKey | null = null;

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

/** Oublie la maîtresse (verrouillage manuel / déconnexion). */
export function lockCoffre(): void {
  cachedMaster = null;
}
