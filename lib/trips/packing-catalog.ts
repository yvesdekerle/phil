/**
 * Garde-robe type (PHIL-Q10) — les affaires qu'on retrouve dans tous les
 * voyages, par catégorie, avec des quantités calées sur la durée du séjour
 * (ajustables avant l'ajout).
 */

export type CatalogItem = {
  title: string;
  /** Quantité proposée selon le nombre de nuits. */
  qty: (nights: number) => number;
};

const one = () => 1;
const perNights =
  (max: number, div = 1) =>
  (nights: number) =>
    Math.max(1, Math.min(max, Math.ceil(nights / div)));

export const PACKING_CATALOG: { category: string; items: CatalogItem[] }[] = [
  {
    category: "Vêtements",
    items: [
      { title: "T-shirts", qty: perNights(10) },
      { title: "Sous-vêtements", qty: (n) => Math.max(2, Math.min(12, n + 1)) },
      { title: "Paires de chaussettes", qty: perNights(8) },
      { title: "Shorts", qty: perNights(5, 3) },
      { title: "Pantalons", qty: perNights(3, 7) },
      { title: "Pull ou petite laine", qty: one },
      { title: "Maillots de bain", qty: (n) => (n >= 5 ? 2 : 1) },
      { title: "Tenue habillée (soirée)", qty: one },
      { title: "Pyjama", qty: one },
      { title: "Casquette ou chapeau", qty: one },
    ],
  },
  {
    category: "Chaussures",
    items: [
      { title: "Baskets", qty: one },
      { title: "Tongs ou sandales", qty: one },
    ],
  },
  {
    category: "Trousse de toilette",
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
    items: [
      { title: "Lunettes de soleil", qty: one },
      { title: "Crème solaire", qty: one },
      { title: "Chargeurs (téléphone, montre…)", qty: one },
      { title: "Batterie externe", qty: one },
      { title: "Adaptateur de prise", qty: one },
      { title: "Médicaments personnels", qty: one },
      { title: "Gourde", qty: one },
      { title: "Sac pour le linge sale", qty: one },
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
