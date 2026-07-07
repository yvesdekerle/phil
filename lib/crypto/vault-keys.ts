/**
 * Orchestration du coffre E2EE (PHIL-T01, Phase 0) — assemble les primitives
 * (`vault-crypto`) et la biométrie (`prf`). NAVIGATEUR UNIQUEMENT.
 *
 * Activation : génère la maîtresse + la paire ECDH, crée la passkey PRF, emballe
 * la maîtresse par le secret PRF et la privée par la maîtresse → renvoie du
 * matériel **sérialisable** que la couche serveur stocke (chiffré, illisible).
 * Déverrouillage : Face ID → secret PRF → déballe la maîtresse.
 *
 * ⚠️ La partie PRF n'est pas testable hors navigateur — valider sur appareil.
 */

import { createCoffreCredential, getPrfSecret } from "./prf";
import * as vc from "./vault-crypto";

const PRF_SALT_BYTES = 32;

/** Matériel à stocker côté serveur après activation (tout est chiffré/public). */
export type CoffreKeyMaterial = {
  publicKeyJwk: JsonWebKey;
  wrappedPrivateKey: string;
  wrappedPrivateIv: string;
  wrappedMasterKey: string;
  wrappedMasterIv: string;
  credentialId: string;
  prfSalt: string;
};

/** Enveloppe de maîtresse telle que relue depuis le serveur pour déverrouiller. */
export type MasterWrap = {
  wrappedMasterKey: string;
  wrappedMasterIv: string;
  credentialId: string;
  prfSalt: string;
};

/** Active le coffre chiffré sur cet appareil (crée la passkey PRF + les clés). */
export async function activateCoffre(userId: string, userName: string): Promise<CoffreKeyMaterial> {
  const master = await vc.generateMasterKey();
  const keypair = await vc.generateKeyPair();

  const credentialId = await createCoffreCredential(userId, userName);
  const salt = crypto.getRandomValues(new Uint8Array(PRF_SALT_BYTES));
  const prfSecret = await getPrfSecret(credentialId, salt);
  const kek = await vc.importAesKey(prfSecret, ["wrapKey", "unwrapKey"]);

  const wrappedMaster = await vc.wrapKey(kek, master);
  const wrappedPrivate = await vc.wrapPrivateKey(master, keypair.privateKey);

  return {
    publicKeyJwk: await vc.exportKeyJwk(keypair.publicKey),
    wrappedPrivateKey: vc.toBase64(wrappedPrivate.data),
    wrappedPrivateIv: vc.toBase64(wrappedPrivate.iv),
    wrappedMasterKey: vc.toBase64(wrappedMaster.data),
    wrappedMasterIv: vc.toBase64(wrappedMaster.iv),
    credentialId: vc.toBase64(credentialId),
    prfSalt: vc.toBase64(salt),
  };
}

/** Déverrouille la clé maîtresse via Face ID à partir des enveloppes stockées. */
export async function unlockMaster(wrap: MasterWrap): Promise<CryptoKey> {
  const prfSecret = await getPrfSecret(
    vc.fromBase64(wrap.credentialId),
    vc.fromBase64(wrap.prfSalt),
  );
  const kek = await vc.importAesKey(prfSecret, ["wrapKey", "unwrapKey"]);
  return vc.unwrapKey(
    kek,
    vc.fromBase64(wrap.wrappedMasterKey),
    vc.fromBase64(wrap.wrappedMasterIv),
    ["wrapKey", "unwrapKey", "encrypt", "decrypt"],
  );
}
