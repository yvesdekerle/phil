import { describe, expect, it } from "vitest";
import * as vc from "@/lib/crypto/vault-crypto";
import {
  createRecoveryWrap,
  generateRecoveryCode,
  normalizeRecoveryCode,
  unwrapMasterFromRecovery,
} from "@/lib/crypto/vault-keys";

// PHIL-T01 Phase 4a — restauration par code de secours. La partie PRF/biométrie
// (enrollDevice, unlockMaster) n'est pas testable hors navigateur ; on couvre
// ici tout ce qui l'est : format du code, normalisation et round-trip de récup.

describe("vault-keys — code de secours", () => {
  it("génère un code de 4 groupes de 4 sans caractères ambigus", () => {
    const code = generateRecoveryCode();
    expect(code).toMatch(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/);
    expect(code).not.toMatch(/[ILO01]/); // alphabet sans ambiguïté
  });

  it("normalise la saisie (casse, espaces, tirets) vers la forme canonique", () => {
    expect(normalizeRecoveryCode("abcd 2345 efgh 6789")).toBe("ABCD-2345-EFGH-6789");
    expect(normalizeRecoveryCode("abcd2345efgh6789")).toBe("ABCD-2345-EFGH-6789");
    expect(normalizeRecoveryCode("ABCD-2345-EFGH-6789")).toBe("ABCD-2345-EFGH-6789");
  });

  it("round-trip : le bon code restaure la maîtresse (fonctionnelle et identique)", async () => {
    const master = await vc.generateMasterKey();
    const rec = await createRecoveryWrap(master);

    const restored = await unwrapMasterFromRecovery(
      { wrappedKey: rec.wrappedKey, wrapIv: rec.wrapIv, salt: rec.salt },
      rec.code,
    );

    // Identique à l'originale (mêmes octets bruts)…
    expect([...(await vc.exportRaw(restored))]).toEqual([...(await vc.exportRaw(master))]);
    // …et fonctionnelle (peut emballer une DEK).
    await expect(vc.wrapKey(restored, await vc.generateDek())).resolves.toBeDefined();
  });

  it("accepte un code saisi en minuscules / avec espaces", async () => {
    const master = await vc.generateMasterKey();
    const rec = await createRecoveryWrap(master);
    const messy = rec.code.toLowerCase().replace(/-/g, " ");

    const restored = await unwrapMasterFromRecovery(
      { wrappedKey: rec.wrappedKey, wrapIv: rec.wrapIv, salt: rec.salt },
      messy,
    );
    expect([...(await vc.exportRaw(restored))]).toEqual([...(await vc.exportRaw(master))]);
  });

  it("rejette un mauvais code", async () => {
    const master = await vc.generateMasterKey();
    const rec = await createRecoveryWrap(master);
    await expect(
      unwrapMasterFromRecovery(
        { wrappedKey: rec.wrappedKey, wrapIv: rec.wrapIv, salt: rec.salt },
        "ZZZZ-2345-EFGH-6789",
      ),
    ).rejects.toThrow();
  });
});
