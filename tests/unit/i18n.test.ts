import { describe, expect, it } from "vitest";
import { locales } from "@/lib/i18n/config";
import { dateFnsLocale, intlLocale } from "@/lib/i18n/dates";
import { en, es, fr as frFull, messages, translator } from "@/lib/i18n/messages";
import { fr } from "@/lib/i18n/messages/fr";

/** Toutes les clés-feuilles d'un dictionnaire, en notation pointée. */
function leafKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    leafKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

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

/**
 * Parité des clés (PHIL-Q37) — l'anglais et l'espagnol peuvent avoir MOINS de
 * clés que le français (repli assuré), mais jamais de clé **orpheline** : une
 * clé qui n'existe pas en FR trahit une faute de frappe ou un renommage oublié,
 * et ne serait jamais affichée. Ce test verrouille toutes les traductions.
 */
describe("parité des clés de traduction", () => {
  const frKeys = new Set(leafKeys(frFull));

  for (const [name, dict] of [
    ["en", en],
    ["es", es],
  ] as const) {
    it(`aucune clé orpheline en "${name}"`, () => {
      const orphans = leafKeys(dict).filter((k) => !frKeys.has(k));
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
