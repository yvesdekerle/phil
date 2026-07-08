import { describe, expect, it } from "vitest";
import { locales } from "@/lib/i18n/config";
import { dateFnsLocale, intlLocale } from "@/lib/i18n/dates";
import { en, es, fr, messages, translator } from "@/lib/i18n/messages";

/** Toutes les clés-feuilles d'un dictionnaire, en notation pointée. */
function leafKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    leafKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

/**
 * Mécanique i18n incrémentale (PHIL-Q37, anglais-first R19b) — la garantie clé :
 * un écran pas encore traduit retombe sur l'anglais (source), jamais sur la clé
 * brute.
 */
describe("translator", () => {
  it("traduit dans la langue active", () => {
    const t = translator({ nav: { trips: "Voyages" } });
    expect(t("nav.trips")).toBe("Voyages");
  });

  it("retombe sur l'anglais (source) quand la clé manque", () => {
    const t = translator({ nav: { trips: "Voyages" } }); // dict sans nav.vault
    expect(t("nav.vault")).toBe(en.nav.vault);
  });

  it("renvoie la clé brute si elle n'existe nulle part", () => {
    const t = translator(en);
    expect(t("does.not.exist")).toBe("does.not.exist");
  });

  it("l'anglais complet se traduit lui-même", () => {
    const t = translator(en);
    expect(t("trips.create")).toBe(en.trips.create);
  });
});

/**
 * Parité des clés (PHIL-Q37, anglais-first R19b) — le français et l'espagnol
 * peuvent avoir MOINS de clés que l'anglais **source** (repli assuré), mais
 * jamais de clé **orpheline** : une clé absente de l'anglais trahit une faute de
 * frappe ou un renommage oublié, et ne serait jamais affichée. Ce test verrouille
 * toutes les traductions.
 */
describe("parité des clés de traduction", () => {
  const enKeys = new Set(leafKeys(en));

  for (const [name, dict] of [
    ["fr", fr],
    ["es", es],
  ] as const) {
    it(`aucune clé orpheline en "${name}"`, () => {
      const orphans = leafKeys(dict).filter((k) => !enKeys.has(k));
      expect(orphans).toEqual([]);
    });
  }

  it("les 3 langues sont enregistrées", () => {
    expect(Object.keys(messages).sort()).toEqual([...locales].sort());
  });
});

/**
 * Localisation des dates/nombres (PHIL-Q37) — chaque langue mappe vers la bonne
 * locale date-fns (noms de jours/mois) et le bon identifiant BCP-47 pour Intl.
 */
describe("dateFnsLocale / intlLocale", () => {
  it("mappe chaque langue vers sa locale date-fns", () => {
    expect(dateFnsLocale("fr").code).toBe("fr");
    expect(dateFnsLocale("en").code).toBe("en-GB");
    expect(dateFnsLocale("es").code).toBe("es");
  });

  it("mappe chaque langue vers son identifiant Intl", () => {
    expect(intlLocale("fr")).toBe("fr-FR");
    expect(intlLocale("en")).toBe("en-GB");
    expect(intlLocale("es")).toBe("es-ES");
  });
});
