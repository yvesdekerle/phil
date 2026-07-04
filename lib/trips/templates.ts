/**
 * Templates de voyage (PHIL-N03) : pré-remplissent le pool d'idées.
 * (Les checklists types viendront avec PHIL-N11.)
 */

export type TripTemplate = {
  key: string;
  name: string;
  description: string;
  ideas: { title: string; description?: string; tags: string[] }[];
  checklist: { section: "avant_depart" | "a_emporter" | "sur_place"; title: string }[];
};

export const TRIP_TEMPLATES: TripTemplate[] = [
  {
    key: "roadtrip",
    name: "Roadtrip",
    description: "Étapes, kilomètres et découvertes — l'itinéraire se dessine en route.",
    ideas: [
      {
        title: "Louer le véhicule",
        description: "Comparer loueurs, assurance tous risques, conducteurs additionnels.",
        tags: ["logistique"],
      },
      {
        title: "Tracer l'itinéraire général",
        description: "Grandes étapes et nombre de nuits par étape.",
        tags: ["itinéraire"],
      },
      { title: "Repérer les points de vue et arrêts photo", tags: ["itinéraire"] },
      { title: "Playlist et jeux de route", tags: ["ambiance"] },
      {
        title: "Prévoir les pleins et péages",
        description: "Budget essence estimé sur la distance totale.",
        tags: ["logistique", "budget"],
      },
    ],
    checklist: [
      { section: "avant_depart", title: "Permis de conduire de chaque conducteur" },
      { section: "avant_depart", title: "Vérifier l'assurance du véhicule" },
      { section: "a_emporter", title: "Chargeur voiture + câbles" },
      { section: "a_emporter", title: "Glacière / encas de route" },
    ],
  },
  {
    key: "chill",
    name: "Vacances chill",
    description: "Farniente assumé — quelques pépites pour les jours d'énergie.",
    ideas: [
      { title: "Repérer LA plage du séjour", tags: ["plage"] },
      { title: "Trouver le resto du coucher de soleil", tags: ["gourmand"] },
      { title: "Un marché local", tags: ["culture"] },
      { title: "Une sortie mer (bateau, snorkeling…)", tags: ["mer"] },
      { title: "Massage / spa", tags: ["détente"] },
    ],
    checklist: [
      { section: "a_emporter", title: "Crème solaire + après-soleil" },
      { section: "a_emporter", title: "Maillots, serviettes de plage" },
      { section: "a_emporter", title: "Enceinte + jeux de cartes" },
      { section: "avant_depart", title: "Adaptateur de prises" },
    ],
  },
  {
    key: "ski",
    name: "Ski",
    description: "Forfaits, matériel, raclette — la montagne s'organise.",
    ideas: [
      {
        title: "Acheter les forfaits",
        description: "Souvent moins cher en ligne à l'avance — vérifier les réductions groupe.",
        tags: ["logistique", "budget"],
      },
      {
        title: "Réserver la location de matériel",
        description: "Skis, chaussures, casques — réduc groupe en ligne.",
        tags: ["logistique"],
      },
      { title: "Cours ESF pour les débutants ?", tags: ["logistique"] },
      { title: "Soirée raclette / fondue", tags: ["gourmand"] },
      { title: "Luge ou balade raquettes pour le jour off", tags: ["détente"] },
      { title: "Vérifier les assurances (carré neige ?)", tags: ["logistique"] },
    ],
    checklist: [
      { section: "avant_depart", title: "Réserver forfaits et matériel" },
      { section: "a_emporter", title: "Gants, masque, crème solaire montagne" },
      { section: "a_emporter", title: "Affaires de raclette (l'appareil !)" },
      { section: "sur_place", title: "Retirer les forfaits" },
    ],
  },
];

export function getTemplate(key: string | null | undefined): TripTemplate | null {
  return TRIP_TEMPLATES.find((t) => t.key === key) ?? null;
}
