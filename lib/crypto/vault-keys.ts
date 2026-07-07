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

// --- Code de secours (Phase 4) : récupération si tous les appareils sont perdus ---

// Alphabet sans caractères ambigus (I, L, O, 0, 1).
const RECOVERY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const RECOVERY_GROUPS = 4;
const RECOVERY_GROUP_LEN = 4;

/** Code de secours lisible : 4 groupes de 4 (ex. « ABCD-2345-EFGH-6789 »). */
export function generateRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(RECOVERY_GROUPS * RECOVERY_GROUP_LEN));
  const chars = Array.from(bytes, (b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length]);
  const groups: string[] = [];
  for (let i = 0; i < RECOVERY_GROUPS; i++) {
    groups.push(chars.slice(i * RECOVERY_GROUP_LEN, (i + 1) * RECOVERY_GROUP_LEN).join(""));
  }
  return groups.join("-");
}

export type RecoveryWrap = { code: string; wrappedKey: string; wrapIv: string; salt: string };

/** Emballe la maîtresse avec une clé dérivée d'un nouveau code de secours. */
export async function createRecoveryWrap(master: CryptoKey): Promise<RecoveryWrap> {
  const code = generateRecoveryCode();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const kek = await vc.deriveKeyFromCode(code, salt);
  const wrapped = await vc.wrapKey(kek, master);
  return {
    code,
    wrappedKey: vc.toBase64(wrapped.data),
    wrapIv: vc.toBase64(wrapped.iv),
    salt: vc.toBase64(salt),
  };
}
