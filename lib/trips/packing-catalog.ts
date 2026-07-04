/**
 * Catalogue de la Valise (PHIL-Q10, réorganisé par PHIL-Q20) — les affaires
 * et préparatifs qu'on retrouve dans tous les voyages, intégrés directement
 * dans chaque section (avant le départ / à emporter / sur place), avec des
 * quantités calées sur la durée du séjour (ajustables).
 */

export type CatalogItem = {
  title: string;
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
  category: string;
  section: CatalogSection;
  items: CatalogItem[];
}[] = [
  {
    category: "Préparatifs",
    section: "avant_depart",
    items: [
      { title: "Vaccins à jour", qty: one },
      { title: "Passeports vérifiés (validité 6 mois après retour)", qty: one },
      { title: "Assurance voyage vérifiée", qty: one },
      { title: "Google Maps hors-ligne téléchargé", qty: one },
      { title: "Copies des papiers dans le coffre Phil", qty: one },
      { title: "Banque prévenue du voyage", qty: one },
    ],
  },
  {
    category: "Vêtements — Haut",
    section: "a_emporter",
    items: [
      { title: "T-shirts", qty: perNights(10) },
      { title: "Chemises ou tops", qty: perNights(4, 4) },
      { title: "Pull ou petite laine", qty: one },
      { title: "Coupe-vent", qty: one },
      { title: "Manteau", qty: one },
      { title: "Tenue habillée (soirée)", qty: one },
      { title: "Casquette ou chapeau", qty: one },
    ],
  },
  {
    category: "Vêtements — Bas",
    section: "a_emporter",
    items: [
      { title: "Shorts", qty: perNights(5, 3) },
      { title: "Pantalons", qty: perNights(3, 7) },
    ],
  },
  {
    category: "Sous-vêtements & nuit",
    section: "a_emporter",
    items: [
      { title: "Sous-vêtements", qty: (n) => Math.max(2, Math.min(12, n + 1)) },
      { title: "Paires de chaussettes", qty: perNights(8) },
      { title: "Maillots de bain", qty: (n) => (n >= 5 ? 2 : 1) },
      { title: "Pyjama", qty: one },
    ],
  },
  {
    category: "Chaussures",
    section: "a_emporter",
    items: [
      { title: "Baskets", qty: one },
      { title: "Tongs ou sandales", qty: one },
    ],
  },
  {
    category: "Trousse de toilette",
    section: "a_emporter",
    items: [
      { title: "Brosse à dents", qty: one },
      { title: "Dentifrice", qty: one },
      { title: "Déodorant", qty: one },
      { title: "Shampoing / gel douche", qty: one },
      { title: "Rasoir", qty: one },
      { title: "Brosse ou peigne", qty: one },
    ],
  },
  {
    category: "Indispensables",
    section: "a_emporter",
    items: [
      { title: "Lunettes de soleil", qty: one },
      { title: "Crème solaire", qty: one },
      { title: "Masque et tuba", qty: one },
      { title: "Chargeurs (téléphone, montre…)", qty: one },
      { title: "Batterie externe", qty: one },
      { title: "Adaptateur de prise", qty: one },
      { title: "Médicaments personnels", qty: one },
      { title: "Gourde", qty: one },
      { title: "Sac pour le linge sale", qty: one },
    ],
  },
  {
    category: "À l'arrivée",
    section: "sur_place",
    items: [
      { title: "Carte SIM locale ou e-SIM activée", qty: one },
      { title: "Espèces retirées en monnaie locale", qty: one },
    ],
  },
];

/** Titre d'item de valise pour un élément du catalogue ("T-shirts ×8"). */
export function catalogItemTitle(title: string, qty: number): string {
  return qty > 1 ? `${title} ×${qty}` : title;
}

/** L'item de valise correspond-il à cet élément du catalogue ? */
export function matchesCatalogItem(checklistTitle: string, catalogTitle: string): boolean {
  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const base = normalize(checklistTitle).replace(/\s*×\d+$/, "");
  return base === normalize(catalogTitle);
}
