/**
 * Primitives cryptographiques du coffre E2EE (PHIL-T01, Phase 0).
 *
 * Web Crypto uniquement (dispo côté client ET en Node pour les tests) — aucune
 * dépendance externe. Le chiffrement/déchiffrement se fait CÔTÉ CLIENT : le
 * serveur ne voit jamais les clés ni le contenu en clair.
 *
 * Modèle :
 *  - clé maîtresse (AES-256-GCM) : scelle les clés de documents (DEK) ;
 *  - DEK (AES-256-GCM) : une par document, chiffre le fichier ;
 *  - paire ECDH P-256 par utilisateur : partage (dérive une clé d'emballage
 *    partagée entre le propriétaire et le destinataire).
 *
 * ⚠️ Code sensible : toute régression = perte de données ou fausse sécurité.
 * Couvert par tests/unit/vault-crypto.test.ts.
 */

const subtle = globalThis.crypto.subtle;
const AES = { name: "AES-GCM", length: 256 } as const;
const IV_BYTES = 12;

export type Wrapped = { data: Uint8Array; iv: Uint8Array };

function randomIv(): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
}

// Web Crypto accepte tout ArrayBufferView à l'exécution ; ce cast aide TS 5.9
// (le `Uint8Array` est devenu générique et n'est plus assignable à BufferSource).
const bs = (b: Uint8Array): BufferSource => b as BufferSource;
const gcm = (iv: Uint8Array): AesGcmParams => ({ name: "AES-GCM", iv: bs(iv) });

// ---------------------------------------------------------------------------
// Clés symétriques : maîtresse et DEK
// ---------------------------------------------------------------------------

/** Clé maîtresse de l'utilisateur (scelle les DEK). Extractible pour l'emballer. */
export function generateMasterKey(): Promise<CryptoKey> {
  return subtle.generateKey(AES, true, ["wrapKey", "unwrapKey", "encrypt", "decrypt"]);
}

/** Clé de chiffrement d'un document (une par document). */
export function generateDek(): Promise<CryptoKey> {
  return subtle.generateKey(AES, true, ["encrypt", "decrypt"]);
}

/** Chiffre des octets avec une DEK (AES-GCM, IV aléatoire). */
export async function encryptBytes(dek: CryptoKey, data: Uint8Array): Promise<Wrapped> {
  const iv = randomIv();
  const ct = new Uint8Array(await subtle.encrypt(gcm(iv), dek, bs(data)));
  return { data: ct, iv };
}

/** Déchiffre des octets avec une DEK. Rejette si la clé/IV est mauvaise (GCM). */
export async function decryptBytes(
  dek: CryptoKey,
  ciphertext: Uint8Array,
  iv: Uint8Array,
): Promise<Uint8Array> {
  return new Uint8Array(await subtle.decrypt(gcm(iv), dek, bs(ciphertext)));
}

// ---------------------------------------------------------------------------
// Emballage de clés (wrap) : une clé AES emballe une autre clé
// ---------------------------------------------------------------------------

/** Emballe `keyToWrap` avec `wrappingKey` (maîtresse ou clé de partage). */
export async function wrapKey(wrappingKey: CryptoKey, keyToWrap: CryptoKey): Promise<Wrapped> {
  const iv = randomIv();
  const wrapped = new Uint8Array(await subtle.wrapKey("raw", keyToWrap, wrappingKey, gcm(iv)));
  return { data: wrapped, iv };
}

/** Déballe une clé AES-GCM (par défaut usages encrypt/decrypt, pour une DEK). */
export function unwrapKey(
  wrappingKey: CryptoKey,
  wrapped: Uint8Array,
  iv: Uint8Array,
  usages: KeyUsage[] = ["encrypt", "decrypt"],
): Promise<CryptoKey> {
  return subtle.unwrapKey("raw", bs(wrapped), wrappingKey, gcm(iv), AES, true, usages);
}

// ---------------------------------------------------------------------------
// Partage : ECDH P-256 (dérive une clé d'emballage partagée)
// ---------------------------------------------------------------------------

/** Paire de clés ECDH d'un utilisateur (publique partagée, privée scellée). */
export function generateKeyPair(): Promise<CryptoKeyPair> {
  return subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
}

/**
 * Clé d'emballage partagée dérivée de MA clé privée + LA clé publique de l'autre.
 * ECDH est symétrique : le propriétaire et le destinataire obtiennent la même
 * clé, servant à emballer/déballer la DEK d'un document partagé.
 */
export function deriveSharedWrapKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<CryptoKey> {
  return subtle.deriveKey({ name: "ECDH", public: publicKey }, privateKey, AES, true, [
    "wrapKey",
    "unwrapKey",
  ]);
}

// ---------------------------------------------------------------------------
// Import / export (stockage : JWK pour l'asymétrique, raw+base64 pour le reste)
// ---------------------------------------------------------------------------

export async function exportRaw(key: CryptoKey): Promise<Uint8Array> {
  return new Uint8Array(await subtle.exportKey("raw", key));
}

/** Importe une clé AES-256 depuis ses octets bruts (ex. secret PRF). */
export function importAesKey(raw: Uint8Array, usages: KeyUsage[]): Promise<CryptoKey> {
  return subtle.importKey("raw", bs(raw), AES, true, usages);
}

export function exportKeyJwk(key: CryptoKey): Promise<JsonWebKey> {
  return subtle.exportKey("jwk", key) as Promise<JsonWebKey>;
}

export function importEcdhPublic(jwk: JsonWebKey): Promise<CryptoKey> {
  return subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, []);
}

export function importEcdhPrivate(jwk: JsonWebKey): Promise<CryptoKey> {
  return subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
}

/**
 * Emballe la clé privée ECDH par la maîtresse. Une clé ECDH ne s'exporte pas en
 * "raw" (donc pas via wrapKey) : on chiffre son JWK avec la maîtresse (AES-GCM).
 */
export async function wrapPrivateKey(master: CryptoKey, privateKey: CryptoKey): Promise<Wrapped> {
  const jwk = await exportKeyJwk(privateKey);
  return encryptBytes(master, new TextEncoder().encode(JSON.stringify(jwk)));
}

/** Déballe la clé privée ECDH (déchiffre son JWK avec la maîtresse). */
export async function unwrapPrivateKey(
  master: CryptoKey,
  wrapped: Uint8Array,
  iv: Uint8Array,
): Promise<CryptoKey> {
  const bytes = await decryptBytes(master, wrapped, iv);
  return importEcdhPrivate(JSON.parse(new TextDecoder().decode(bytes)) as JsonWebKey);
}

// ---------------------------------------------------------------------------
// Base64 (stockage/transport des octets)
// ---------------------------------------------------------------------------

export function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) {
    s += String.fromCharCode(b);
  }
  return btoa(s);
}

export function fromBase64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
