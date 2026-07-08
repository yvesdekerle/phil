/**
 * Appariement d'appareils par QR (PHIL-T01, Phase 4c). Transfert E2EE de la clé
 * maîtresse d'un appareil configuré vers un appareil neuf, via un relais serveur
 * qui ne voit que du public (clés éphémères ECDH) et du chiffré (maîtresse
 * emballée par la clé ECDH partagée).
 *
 * Web Crypto uniquement (testable en Node : pas de PRF/biométrie ici).
 */

import * as vc from "./vault-crypto";

/** Demande d'appariement générée par l'appareil NEUF (garde la privée en mémoire). */
export type PairingRequest = { ephemeralPublicJwk: JsonWebKey; privateKey: CryptoKey };

/** Réponse d'appariement produite par l'appareil CONFIGURÉ (relayée au neuf). */
export type PairingGrant = { configuredPublicJwk: JsonWebKey; wrappedMaster: string; iv: string };

/** Appareil neuf : génère une paire ECDH éphémère ; publie la publique, garde la privée. */
export async function createPairingRequest(): Promise<PairingRequest> {
  const kp = await vc.generateKeyPair();
  return { ephemeralPublicJwk: await vc.exportKeyJwk(kp.publicKey), privateKey: kp.privateKey };
}

/**
 * Appareil configuré : dérive une clé partagée (sa privée éphémère × la publique
 * du neuf) et emballe la maîtresse avec. Renvoie sa publique éphémère + le chiffré.
 */
export async function wrapMasterForPairing(
  master: CryptoKey,
  newPublicJwk: JsonWebKey,
): Promise<PairingGrant> {
  const kp = await vc.generateKeyPair();
  const newPub = await vc.importEcdhPublic(newPublicJwk);
  const shared = await vc.deriveSharedWrapKey(kp.privateKey, newPub);
  const wrapped = await vc.wrapKey(shared, master);
  return {
    configuredPublicJwk: await vc.exportKeyJwk(kp.publicKey),
    wrappedMaster: vc.toBase64(wrapped.data),
    iv: vc.toBase64(wrapped.iv),
  };
}

/**
 * Appareil neuf : dérive la MÊME clé partagée (sa privée × la publique du
 * configuré) et déballe la maîtresse. Extractible → ré-emballable via `enrollDevice`.
 */
export async function unwrapMasterFromPairing(
  privateKey: CryptoKey,
  grant: PairingGrant,
): Promise<CryptoKey> {
  const cfgPub = await vc.importEcdhPublic(grant.configuredPublicJwk);
  const shared = await vc.deriveSharedWrapKey(privateKey, cfgPub);
  return vc.unwrapKey(shared, vc.fromBase64(grant.wrappedMaster), vc.fromBase64(grant.iv), [
    "wrapKey",
    "unwrapKey",
    "encrypt",
    "decrypt",
  ]);
}
