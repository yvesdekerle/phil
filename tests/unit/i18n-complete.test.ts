import { describe, expect, it } from "vitest";
import { completeMessages } from "@/lib/i18n/messages";
import { lookup, makeTranslator } from "@/lib/i18n/translate";

/**
 * PHIL-R19 — la purge du catalogue i18n du bundle client repose sur un repli
 * **anglais (source) fusionné côté serveur** (`completeMessages`) : le client n'a
 * alors plus besoin du catalogue en pour combler les clés non traduites. Ces
 * tests verrouillent cette invariance (sinon fr/es afficheraient des clés brutes).
 */
describe("completeMessages — repli anglais fusionné", () => {
  it("couvre les clés source (en) même quand la locale ne les traduit pas", () => {
    const fr = completeMessages("fr");
    // Clés issues de namespaces variés : présentes dans le dict complet fr.
    expect(lookup(fr, "nav.trips")).toBeTypeOf("string");
    expect(lookup(fr, "activities.super")).toBeTypeOf("string");
    expect(lookup(fr, "budget.errors.invalidExpense")).toBeTypeOf("string");
  });

  it("fusion profonde : un namespace partiellement traduit garde les clés en", () => {
    const es = completeMessages("es");
    // Toute clé source valide doit résoudre (pas de trou dû à un merge shallow).
    const t = makeTranslator(es);
    expect(t("guide.settlements")).not.toBe("guide.settlements");
    expect(t("pending.tripAria")).not.toBe("pending.tripAria");
  });

  it("en : completeMessages renvoie la source complète", () => {
    const t = makeTranslator(completeMessages("en"));
    expect(t("nav.trips")).not.toBe("nav.trips");
  });
});

describe("makeTranslator — sans données", () => {
  it("dict vide → renvoie la clé brute (aucun catalogue requis)", () => {
    expect(makeTranslator({})("nav.trips")).toBe("nav.trips");
  });

  it("résout une clé pointée présente dans le dict fourni", () => {
    const t = makeTranslator({ nav: { trips: "Voyages" } });
    expect(t("nav.trips")).toBe("Voyages");
    expect(t("nav.absente")).toBe("nav.absente");
  });
});
