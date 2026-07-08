import { getMyMasterWraps } from "@/app/(app)/profile/coffre-actions";
import { getCoffreMaster, isCoffreUnlocked, primeCoffreMaster } from "@/lib/crypto/coffre-session";
import { unlockMaster } from "@/lib/crypto/vault-keys";
import { offlineDb } from "./db";

/**
 * Cache crypto du coffre pour l'offline (PHIL-T01 Phase 4b). On mémorise les
 * enveloppes PRF de la maîtresse (déjà chiffrées) pour pouvoir déverrouiller le
 * coffre SANS réseau : la biométrie WebAuthn fonctionne hors ligne (authenticator
 * local), mais la lecture des enveloppes côté serveur, non — d'où ce cache.
 */

/** Mémorise les enveloppes maîtresse de l'utilisateur (à faire pendant qu'on est en ligne). */
export async function cacheMasterWraps(): Promise<void> {
  const wraps = await getMyMasterWraps();
  if (wraps.length > 0) {
    await offlineDb.crypto_wraps.put({ key: "master", wraps });
  }
}

/**
 * Renvoie la clé maîtresse utilisable **offline** : la session mémoire si le
 * coffre est déjà déverrouillé, sinon les enveloppes en cache + biométrie locale.
 * Lève si rien n'a été mis en cache (il faut avoir ouvert le coffre en ligne une fois).
 */
export async function getOfflineMaster(): Promise<CryptoKey> {
  if (isCoffreUnlocked()) {
    return getCoffreMaster();
  }
  const rec = await offlineDb.crypto_wraps.get("master");
  if (!rec || rec.wraps.length === 0) {
    throw new Error("Clés du coffre absentes du cache — ouvre ton coffre en ligne une fois.");
  }
  const master = await unlockMaster(rec.wraps);
  primeCoffreMaster(master);
  return master;
}
