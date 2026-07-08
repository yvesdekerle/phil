import { describe, expect, it } from "vitest";
import {
  createPairingRequest,
  unwrapMasterFromPairing,
  wrapMasterForPairing,
} from "@/lib/crypto/device-pairing";
import * as vc from "@/lib/crypto/vault-crypto";

// PHIL-T01 Phase 4c — round-trip d'appariement (la partie ECDH est testable hors
// navigateur ; l'enrôlement PRF/biométrie ne l'est pas).

describe("device-pairing — transfert de la maîtresse par ECDH éphémère", () => {
  it("l'appareil neuf récupère exactement la maîtresse de l'appareil configuré", async () => {
    const master = await vc.generateMasterKey();

    // Neuf : génère sa paire éphémère, publie la publique.
    const req = await createPairingRequest();
    // Configuré : emballe la maîtresse pour la publique du neuf.
    const grant = await wrapMasterForPairing(master, req.ephemeralPublicJwk);
    // Neuf : déballe avec sa privée.
    const restored = await unwrapMasterFromPairing(req.privateKey, grant);

    expect([...(await vc.exportRaw(restored))]).toEqual([...(await vc.exportRaw(master))]);
    await expect(vc.wrapKey(restored, await vc.generateDek())).resolves.toBeDefined();
  });

  it("le relais ne transporte que du public + du chiffré (pas la maîtresse)", async () => {
    const master = await vc.generateMasterKey();
    const req = await createPairingRequest();
    const grant = await wrapMasterForPairing(master, req.ephemeralPublicJwk);

    // La publique éphémère n'a pas de composante privée.
    expect(req.ephemeralPublicJwk.d).toBeUndefined();
    expect(grant.configuredPublicJwk.d).toBeUndefined();
    // Le chiffré ne correspond pas aux octets bruts de la maîtresse.
    const rawMaster = await vc.exportRaw(master);
    expect([...vc.fromBase64(grant.wrappedMaster)]).not.toEqual([...rawMaster]);
  });

  it("une autre paire éphémère ne peut pas déballer", async () => {
    const master = await vc.generateMasterKey();
    const req = await createPairingRequest();
    const grant = await wrapMasterForPairing(master, req.ephemeralPublicJwk);

    const intruder = await createPairingRequest();
    await expect(unwrapMasterFromPairing(intruder.privateKey, grant)).rejects.toThrow();
  });
});
