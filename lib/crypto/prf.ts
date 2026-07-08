/**
 * WebAuthn PRF (PHIL-T01, Phase 0) — la biométrie (Face ID/empreinte) produit un
 * secret cryptographique **stable**, utilisé comme clé d'emballage de la maîtresse.
 * NAVIGATEUR UNIQUEMENT (utilise `navigator`/`window`).
 *
 * ⚠️ NON TESTABLE en Node/CI : à valider sur un vrai appareil. Le support PRF
 * n'est confirmé qu'à l'exécution (résultats `prf` non vides).
 */

// L'extension PRF n'est pas encore dans toutes les versions de lib.dom : on la
// décrit localement et on caste au passage des options WebAuthn.
type PrfCreate = { prf: Record<string, never> };
type PrfGet = { prf: { eval: { first: BufferSource } } };
type PrfResults = { prf?: { results?: { first?: ArrayBuffer } } };

function rpId(): string {
  return window.location.hostname;
}
// BufferSource : Web Crypto/WebAuthn acceptent tout ArrayBufferView à
// l'exécution ; on aide TS 5.9 (Uint8Array générique) au passage.
const asBytes = (b: Uint8Array): BufferSource => b as BufferSource;
function challenge(): BufferSource {
  return asBytes(crypto.getRandomValues(new Uint8Array(32)));
}

/** Le navigateur peut-il faire du WebAuthn ? (le vrai support PRF se voit à l'exécution) */
export function isWebAuthnAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined";
}

/** Crée une passkey « coffre » avec l'extension PRF activée. Renvoie son id. */
export async function createCoffreCredential(
  userId: string,
  userName: string,
): Promise<Uint8Array> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: challenge(),
      rp: { id: rpId(), name: "Phil" },
      user: {
        id: asBytes(new TextEncoder().encode(userId)),
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { userVerification: "required", residentKey: "preferred" },
      extensions: { prf: {} } as unknown as PrfCreate as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!cred) {
    throw new Error("Création de la passkey annulée");
  }
  return new Uint8Array(cred.rawId);
}

/**
 * Déclenche Face ID/empreinte sur la passkey coffre et renvoie le secret PRF
 * (stable pour un (credential, salt) donnés). Lève si l'appareil ne supporte pas PRF.
 */
export async function getPrfSecret(
  credentialId: Uint8Array,
  salt: Uint8Array,
): Promise<Uint8Array> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: challenge(),
      rpId: rpId(),
      allowCredentials: [{ id: credentialId as BufferSource, type: "public-key" }],
      userVerification: "required",
      extensions: {
        prf: { eval: { first: salt as BufferSource } },
      } as unknown as PrfGet as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!assertion) {
    throw new Error("Déverrouillage annulé");
  }
  const results = assertion.getClientExtensionResults() as unknown as PrfResults;
  const secret = results.prf?.results?.first;
  if (!secret) {
    throw new Error("PRF non supporté sur cet appareil");
  }
  return new Uint8Array(secret);
}

/**
 * Déverrouillage multi-appareils (PHIL-T01, Phase 4a). On propose TOUTES les
 * passkeys connues à l'authentificateur : seul l'appareil courant possède l'une
 * d'elles, il répond, et `rawId` nous dit laquelle → on choisit la bonne
 * enveloppe. Le sel PRF est partagé entre appareils (invariant tenu à l'enrôlement),
 * donc un seul `eval.first` suffit. Renvoie le credential qui a répondu + son secret.
 */
export async function getPrfSecretForDevices(
  credentialIds: Uint8Array[],
  salt: Uint8Array,
): Promise<{ credentialId: Uint8Array; secret: Uint8Array }> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: challenge(),
      rpId: rpId(),
      allowCredentials: credentialIds.map((id) => ({
        id: id as BufferSource,
        type: "public-key",
      })),
      userVerification: "required",
      extensions: {
        prf: { eval: { first: salt as BufferSource } },
      } as unknown as PrfGet as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!assertion) {
    throw new Error("Déverrouillage annulé");
  }
  const results = assertion.getClientExtensionResults() as unknown as PrfResults;
  const secret = results.prf?.results?.first;
  if (!secret) {
    throw new Error("PRF non supporté sur cet appareil");
  }
  return { credentialId: new Uint8Array(assertion.rawId), secret: new Uint8Array(secret) };
}
