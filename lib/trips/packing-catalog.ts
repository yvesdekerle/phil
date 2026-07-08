import { checklistEn } from "@/lib/i18n/messages/en/checklist";
import { checklistEs } from "@/lib/i18n/messages/es/checklist";
import { checklistFr } from "@/lib/i18n/messages/fr/checklist";

/**
 * Catalogue de la Valise (PHIL-Q10/Q20, i18n PHIL-Q37) — les affaires et
 * préparatifs récurrents, avec une **clé stable** par item et par catégorie.
 * Les noms affichés vivent dans les messages (`checklist.catalog.<key>` et
 * `checklist.catalogCat.<categoryKey>`), donc traduisibles ; la clé sert au
 * dédoublonnage entre membres, indépendamment de la langue.
 */

export type CatalogItem = {
  key: string;
  /** Quantité proposée selon le nombre de nuits. */
  qty: (nights: number) => number;
};

export type CatalogSection = "avant_depart" | "a_emporter" | "sur_place";

const one = () => 1;
const perNights =
  (max: number, div = 1) =>
  (nights: number) =>
    Math.max(1, Math.min(max, Math.ceil(nights / div)));

export const PACKING_CATALOG: {
  categoryKey: string;
  section: CatalogSection;
  items: CatalogItem[];
}[] = [
  {
    categoryKey: "prep",
    section: "avant_depart",
    items: [
      { key: "vaccines", qty: one },
      { key: "passports", qty: one },
      { key: "insurance", qty: one },
      { key: "offlineMaps", qty: one },
      { key: "docCopies", qty: one },
      { key: "bankNotified", qty: one },
    ],
  },
  {
    categoryKey: "clothingTop",
    section: "a_emporter",
    items: [
      { key: "tshirts", qty: perNights(10) },
      { key: "shirts", qty: perNights(4, 4) },
      { key: "sweater", qty: one },
      { key: "windbreaker", qty: one },
      { key: "coat", qty: one },
      { key: "dressyOutfit", qty: one },
      { key: "hat", qty: one },
    ],
  },
  {
    categoryKey: "clothingBottom",
    section: "a_emporter",
    items: [
      { key: "shorts", qty: perNights(5, 3) },
      { key: "pants", qty: perNights(3, 7) },
    ],
  },
  {
    categoryKey: "underwear",
    section: "a_emporter",
    items: [
      { key: "underwear", qty: (n) => Math.max(2, Math.min(12, n + 1)) },
      { key: "socks", qty: perNights(8) },
      { key: "swimwear", qty: (n) => (n >= 5 ? 2 : 1) },
      { key: "pyjamas", qty: one },
    ],
  },
  {
    categoryKey: "shoes",
    section: "a_emporter",
    items: [
      { key: "sneakers", qty: one },
      { key: "sandals", qty: one },
    ],
  },
  {
    categoryKey: "toiletry",
    section: "a_emporter",
    items: [
      { key: "toothbrush", qty: one },
      { key: "toothpaste", qty: one },
      { key: "deodorant", qty: one },
      { key: "shampoo", qty: one },
      { key: "razor", qty: one },
      { key: "comb", qty: one },
    ],
  },
  {
    categoryKey: "essentials",
    section: "a_emporter",
    items: [
      { key: "sunglasses", qty: one },
      { key: "sunscreen", qty: one },
      { key: "snorkel", qty: one },
      { key: "chargers", qty: one },
      { key: "powerbank", qty: one },
      { key: "adapter", qty: one },
      { key: "meds", qty: one },
      { key: "waterBottle", qty: one },
      { key: "laundryBag", qty: one },
    ],
  },
  {
    categoryKey: "arrival",
    section: "sur_place",
    items: [
      { key: "simCard", qty: one },
      { key: "cash", qty: one },
    ],
  },
];

/** Titre d'item de valise à partir d'un nom localisé ("T-shirts ×8"). */
export function catalogItemTitle(name: string, qty: number): string {
  return qty > 1 ? `${name} ×${qty}` : name;
}

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

// Noms du catalogue par langue (slice `checklist.catalog.*` uniquement) : assez
// pour reconnaître un item ajouté dans une autre langue, sans embarquer TOUT le
// catalogue de messages dans le bundle client — `packing-catalog` est importé
// par le composant client de la Valise (PHIL-R19).
const catalogOf = (m: {
  checklist?: { catalog?: Record<string, string> };
}): Record<string, string> => m.checklist?.catalog ?? {};
const CATALOG_NAMES: Record<string, string>[] = [
  catalogOf(checklistFr),
  catalogOf(checklistEn),
  catalogOf(checklistEs),
];

/**
 * L'item de valise (peu importe la langue où il a été ajouté) correspond-il à
 * cette clé de catalogue ? On compare le titre stocké au nom du catalogue dans
 * **toutes les langues** — ainsi un item ajouté en FR reste reconnu vu en ES.
 */
export function matchesCatalogKey(checklistTitle: string, key: string): boolean {
  const base = normalize(checklistTitle).replace(/\s*×\d+$/, "");
  return CATALOG_NAMES.some((names) => {
    const name = names[key];
    return typeof name === "string" && normalize(name) === base;
  });
}
