import { describe, expect, it } from "vitest";
import { completeMessages } from "@/lib/i18n/messages";
import { lookup, makeTranslator } from "@/lib/i18n/translate";

/**
 * PHIL-R19 — la purge du catalogue i18n du bundle client repose sur un repli
 * français **fusionné côté serveur** (`completeMessages`) : le client n'a alors
 * plus besoin du catalogue fr pour combler les clés non traduites. Ces tests
 * verrouillent cette invariance (sinon en/es afficheraient des clés brutes).
 */
describe("completeMessages — repli fr fusionné", () => {
  it("couvre les clés fr même quand la locale ne les traduit pas", () => {
    const en = completeMessages("en");
    // Clés issues de namespaces variés : présentes dans le dict complet en.
    expect(lookup(en, "nav.trips")).toBeTypeOf("string");
    expect(lookup(en, "activities.super")).toBeTypeOf("string");
    expect(lookup(en, "budget.errors.invalidExpense")).toBeTypeOf("string");
  });

  it("fusion profonde : un namespace partiellement traduit garde les clés fr", () => {
    const es = completeMessages("es");
    // Toute clé fr valide doit résoudre (pas de trou dû à un merge shallow).
    const t = makeTranslator(es);
    expect(t("guide.settlements")).not.toBe("guide.settlements");
    expect(t("pending.tripAria")).not.toBe("pending.tripAria");
  });

  it("fr : completeMessages renvoie la source complète", () => {
    const t = makeTranslator(completeMessages("fr"));
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
