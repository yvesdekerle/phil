import { describe, expect, it } from "vitest";
import * as vc from "@/lib/crypto/vault-crypto";

const enc = new TextEncoder();
const dec = new TextDecoder();

describe("vault-crypto — chiffrement d'un document (DEK)", () => {
  it("chiffre puis déchiffre (round-trip)", async () => {
    const dek = await vc.generateDek();
    const data = enc.encode("Passeport n° 12AB34567");
    const { data: ct, iv } = await vc.encryptBytes(dek, data);
    expect([...ct]).not.toEqual([...data]); // réellement chiffré
    const back = await vc.decryptBytes(dek, ct, iv);
    expect(dec.decode(back)).toBe("Passeport n° 12AB34567");
  });

  it("refuse le déchiffrement avec une autre clé", async () => {
    const dek = await vc.generateDek();
    const other = await vc.generateDek();
    const { data: ct, iv } = await vc.encryptBytes(dek, enc.encode("secret"));
    await expect(vc.decryptBytes(other, ct, iv)).rejects.toThrow();
  });
});

describe("vault-crypto — emballage par la clé maîtresse", () => {
  it("emballe/déballe une DEK et redéchiffre (round-trip)", async () => {
    const master = await vc.generateMasterKey();
    const dek = await vc.generateDek();
    const { data: ct, iv } = await vc.encryptBytes(dek, enc.encode("carte d'identité"));
    const { data: wrapped, iv: wiv } = await vc.wrapKey(master, dek);

    const dek2 = await vc.unwrapKey(master, wrapped, wiv);
    expect(dec.decode(await vc.decryptBytes(dek2, ct, iv))).toBe("carte d'identité");
  });

  it("une autre maîtresse ne peut pas déballer", async () => {
    const master = await vc.generateMasterKey();
    const other = await vc.generateMasterKey();
    const dek = await vc.generateDek();
    const { data: wrapped, iv } = await vc.wrapKey(master, dek);
    await expect(vc.unwrapKey(other, wrapped, iv)).rejects.toThrow();
  });
});

describe("vault-crypto — partage E2EE (ECDH P-256)", () => {
  it("le destinataire déchiffre un document partagé, un tiers non", async () => {
    const owner = await vc.generateKeyPair(); // Yves
    const recipient = await vc.generateKeyPair(); // Amélie
    const stranger = await vc.generateKeyPair(); // Chloé

    const dek = await vc.generateDek();
    const { data: ct, iv } = await vc.encryptBytes(dek, enc.encode("CNI de Yves"));

    // Yves emballe la DEK pour Amélie (sa privée + publique d'Amélie)
    const ownerShare = await vc.deriveSharedWrapKey(owner.privateKey, recipient.publicKey);
    const { data: wrapped, iv: wiv } = await vc.wrapKey(ownerShare, dek);

    // Amélie dérive la MÊME clé (sa privée + publique de Yves) et déballe
    const recipShare = await vc.deriveSharedWrapKey(recipient.privateKey, owner.publicKey);
    const dekForAmelie = await vc.unwrapKey(recipShare, wrapped, wiv);
    expect(dec.decode(await vc.decryptBytes(dekForAmelie, ct, iv))).toBe("CNI de Yves");

    // Chloé (tiers) ne dérive pas la bonne clé
    const strangerShare = await vc.deriveSharedWrapKey(stranger.privateKey, owner.publicKey);
    await expect(vc.unwrapKey(strangerShare, wrapped, wiv)).rejects.toThrow();
  });
});

describe("vault-crypto — sceller / ouvrir un document (Phase 1)", () => {
  it("scelle puis ouvre un document avec la maîtresse (round-trip)", async () => {
    const master = await vc.generateMasterKey();
    const sealed = await vc.sealDocument(master, enc.encode("PDF passeport"));
    expect([...sealed.ciphertext]).not.toEqual([...enc.encode("PDF passeport")]);
    expect(dec.decode(await vc.openDocument(master, sealed))).toBe("PDF passeport");
  });

  it("une autre maîtresse ne peut pas ouvrir le document", async () => {
    const master = await vc.generateMasterKey();
    const other = await vc.generateMasterKey();
    const sealed = await vc.sealDocument(master, enc.encode("secret"));
    await expect(vc.openDocument(other, sealed)).rejects.toThrow();
  });

  it("partage : le propriétaire ré-emballe la DEK, le destinataire ouvre", async () => {
    const master = await vc.generateMasterKey();
    const owner = await vc.generateKeyPair();
    const recipient = await vc.generateKeyPair();
    const sealed = await vc.sealDocument(master, enc.encode("CNI partagée"));

    // Propriétaire : ré-emballe la DEK pour le destinataire
    const ownerShare = await vc.deriveSharedWrapKey(owner.privateKey, recipient.publicKey);
    const forRecipient = await vc.rewrapDekForRecipient(master, sealed, ownerShare);

    // Destinataire : déballe la DEK avec la clé partagée, déchiffre le fichier
    const recipShare = await vc.deriveSharedWrapKey(recipient.privateKey, owner.publicKey);
    const dek = await vc.unwrapKey(recipShare, forRecipient.data, forRecipient.iv);
    expect(dec.decode(await vc.decryptBytes(dek, sealed.ciphertext, sealed.iv))).toBe(
      "CNI partagée",
    );
  });
});

describe("vault-crypto — sérialisation (stockage)", () => {
  it("base64 round-trip", () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255]);
    expect([...vc.fromBase64(vc.toBase64(bytes))]).toEqual([...bytes]);
  });

  it("clé publique ECDH exportée en JWK reste utilisable", async () => {
    const owner = await vc.generateKeyPair();
    const recipient = await vc.generateKeyPair();
    const importedPub = await vc.importEcdhPublic(await vc.exportKeyJwk(recipient.publicKey));
    const k = await vc.deriveSharedWrapKey(owner.privateKey, importedPub);
    const dek = await vc.generateDek();
    const { data: w, iv } = await vc.wrapKey(k, dek);
    const k2 = await vc.deriveSharedWrapKey(recipient.privateKey, owner.publicKey);
    await expect(vc.unwrapKey(k2, w, iv)).resolves.toBeDefined();
  });

  it("emballe/déballe la clé privée ECDH via la maîtresse (reste utilisable)", async () => {
    const master = await vc.generateMasterKey();
    const me = await vc.generateKeyPair();
    const peer = await vc.generateKeyPair();
    const { data, iv } = await vc.wrapPrivateKey(master, me.privateKey);
    const priv2 = await vc.unwrapPrivateKey(master, data, iv);
    // la privée réimportée dérive la même clé partagée que l'originale
    const dek = await vc.generateDek();
    const w = await vc.wrapKey(await vc.deriveSharedWrapKey(me.privateKey, peer.publicKey), dek);
    await expect(
      vc.unwrapKey(await vc.deriveSharedWrapKey(priv2, peer.publicKey), w.data, w.iv),
    ).resolves.toBeDefined();
  });

  it("secret brut (façon PRF) importable comme clé d'emballage de la maîtresse", async () => {
    const prfSecret = globalThis.crypto.getRandomValues(new Uint8Array(32));
    const master = await vc.generateMasterKey();
    const kek = await vc.importAesKey(prfSecret, ["wrapKey", "unwrapKey"]);
    const { data: w, iv } = await vc.wrapKey(kek, master);
    // Ré-importer le même secret → déballe la maîtresse
    const kek2 = await vc.importAesKey(prfSecret, ["wrapKey", "unwrapKey"]);
    const master2 = await vc.unwrapKey(kek2, w, iv, ["wrapKey", "unwrapKey", "encrypt", "decrypt"]);
    // La maîtresse redevient fonctionnelle
    const dek = await vc.generateDek();
    await expect(vc.wrapKey(master2, dek)).resolves.toBeDefined();
  });
});
