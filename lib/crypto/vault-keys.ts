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

import { createCoffreCredential, getPrfSecret, getPrfSecretForDevices } from "./prf";
import * as vc from "./vault-crypto";

const PRF_SALT_BYTES = 32;
const MASTER_USAGES: KeyUsage[] = ["wrapKey", "unwrapKey", "encrypt", "decrypt"];

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

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

/**
 * Déverrouille la clé maîtresse via Face ID (PHIL-T01, Phase 4a — multi-appareils).
 * On présente toutes les enveloppes PRF connues du compte : l'authentificateur ne
 * répond qu'avec la passkey présente sur CET appareil, on retient l'enveloppe
 * correspondante et on la déballe avec le secret PRF renvoyé.
 */
export async function unlockMaster(wraps: MasterWrap[]): Promise<CryptoKey> {
  if (wraps.length === 0) {
    throw new Error("Coffre non activé sur ce compte.");
  }
  // Sel PRF partagé entre appareils (garanti à l'enrôlement) : un seul suffit.
  const salt = vc.fromBase64(wraps[0].prfSalt);
  const credentialIds = wraps.map((w) => vc.fromBase64(w.credentialId));
  const { credentialId, secret } = await getPrfSecretForDevices(credentialIds, salt);
  const wrap = wraps.find((w) => sameBytes(vc.fromBase64(w.credentialId), credentialId));
  if (!wrap) {
    throw new Error("Aucune enveloppe de clé pour cet appareil.");
  }
  const kek = await vc.importAesKey(secret, ["wrapKey", "unwrapKey"]);
  return vc.unwrapKey(
    kek,
    vc.fromBase64(wrap.wrappedMasterKey),
    vc.fromBase64(wrap.wrappedMasterIv),
    MASTER_USAGES,
  );
}

/** Matériel d'une enveloppe PRF d'appareil, à stocker côté serveur. */
export type DeviceWrapMaterial = {
  credentialId: string;
  wrappedMasterKey: string;
  wrappedMasterIv: string;
  prfSalt: string;
};

/**
 * Enrôle CET appareil pour une maîtresse déjà en main (restauration Phase 4a,
 * futur ajout par QR Phase 4c) : crée une passkey PRF locale et emballe la
 * maîtresse par son secret. Réutilise `sharedSalt` s'il est fourni, pour garder
 * le sel PRF identique entre tous les appareils (requis par `unlockMaster`).
 */
export async function enrollDevice(
  userId: string,
  userName: string,
  master: CryptoKey,
  sharedSalt?: string,
): Promise<DeviceWrapMaterial> {
  const credentialId = await createCoffreCredential(userId, userName);
  const salt = sharedSalt
    ? vc.fromBase64(sharedSalt)
    : crypto.getRandomValues(new Uint8Array(PRF_SALT_BYTES));
  const prfSecret = await getPrfSecret(credentialId, salt);
  const kek = await vc.importAesKey(prfSecret, ["wrapKey", "unwrapKey"]);
  const wrapped = await vc.wrapKey(kek, master);
  return {
    credentialId: vc.toBase64(credentialId),
    wrappedMasterKey: vc.toBase64(wrapped.data),
    wrappedMasterIv: vc.toBase64(wrapped.iv),
    prfSalt: vc.toBase64(salt),
  };
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

/**
 * Remet un code saisi par l'utilisateur dans sa forme canonique (majuscules,
 * groupes de 4 séparés par des tirets) — pour que la dérivation PBKDF2 retombe
 * sur exactement la chaîne utilisée à la génération, quels que soient la casse,
 * les espaces ou les tirets tapés.
 */
export function normalizeRecoveryCode(input: string): string {
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const groups: string[] = [];
  for (let i = 0; i < clean.length; i += RECOVERY_GROUP_LEN) {
    groups.push(clean.slice(i, i + RECOVERY_GROUP_LEN));
  }
  return groups.join("-");
}

export type RecoveryWrap = { code: string; wrappedKey: string; wrapIv: string; salt: string };

/** Enveloppe de récupération telle que relue du serveur (sans le code, jamais stocké). */
export type RecoveryStored = { wrappedKey: string; wrapIv: string; salt: string };

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

/**
 * Restaure la maîtresse à partir du code de secours (PHIL-T01, Phase 4a) : dérive
 * la clé d'emballage (PBKDF2) et déballe. Lève (GCM) si le code est faux → sert
 * aussi à valider la saisie. La maîtresse renvoyée est extractible : elle peut
 * ensuite être ré-emballée pour cet appareil via `enrollDevice`.
 */
export async function unwrapMasterFromRecovery(
  rec: RecoveryStored,
  code: string,
): Promise<CryptoKey> {
  const kek = await vc.deriveKeyFromCode(normalizeRecoveryCode(code), vc.fromBase64(rec.salt));
  return vc.unwrapKey(kek, vc.fromBase64(rec.wrappedKey), vc.fromBase64(rec.wrapIv), MASTER_USAGES);
}
