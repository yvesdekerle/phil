import { describe, expect, it } from "vitest";
import { translator } from "@/lib/i18n/messages";
import { fr } from "@/lib/i18n/messages/fr";

/**
 * Mécanique i18n incrémentale (PHIL-Q37) — la garantie clé : un écran anglais
 * pas encore traduit retombe sur le français, jamais sur la clé brute.
 */
describe("translator", () => {
  it("traduit dans la langue active", () => {
    const t = translator({ nav: { trips: "Trips" } });
    expect(t("nav.trips")).toBe("Trips");
  });

  it("retombe sur le français quand la clé anglaise manque", () => {
    const t = translator({ nav: { trips: "Trips" } }); // pas de nav.vault en "en"
    expect(t("nav.vault")).toBe(fr.nav.vault); // "Coffre"
  });

  it("renvoie la clé brute si elle n'existe nulle part", () => {
    const t = translator(fr);
    expect(t("does.not.exist")).toBe("does.not.exist");
  });

  it("le français complet se traduit lui-même", () => {
    const t = translator(fr);
    expect(t("trips.create")).toBe("Créer un voyage");
  });
});
