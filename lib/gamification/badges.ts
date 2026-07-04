/**
 * Badges de l'explorateur (PHIL-P12) — catalogue arrêté en PHIL-P11.
 * Calculés à la volée depuis les données réelles : pas de table de
 * progression, pas de trigger, pas de notification en v1.
 */

export type BadgeStats = {
  trips: number;
  doneTrips: number;
  travelDays: number;
  km: number;
  countries: number;
  packItems: number;
  ideas: number;
  votes: number;
  journalPages: number;
  photos: number;
  emergencySheets: number;
  documents: number;
};

export type Badge = {
  id: string;
  name: string;
  description: string;
  /** Nom d'icône lucide, mappé dans le composant. */
  icon: string;
  unlocked: boolean;
  value: number;
  target: number;
};

export function computeBadges(s: BadgeStats): Badge[] {
  const def = (
    id: string,
    name: string,
    description: string,
    icon: string,
    value: number,
    target: number,
  ): Badge => ({
    id,
    name,
    description,
    icon,
    unlocked: value >= target,
    value: Math.min(value, target),
    target,
  });

  return [
    // Exploration
    def(
      "premier-pas",
      "Premier pas",
      "Un voyage au carnet — 80 jours, ça commence là.",
      "Footprints",
      s.trips,
      1,
    ),
    def("globe-trotteur", "Globe-trotteur", "Trois voyages bouclés.", "Luggage", s.doneTrips, 3),
    def("phileas", "Phileas", "80 jours de voyage cumulés.", "Watch", s.travelDays, 80),
    def(
      "cinq-semaines",
      "Cinq semaines en ballon",
      "5 000 km à vol d'oiseau.",
      "Wind",
      Math.round(s.km),
      5000,
    ),
    def(
      "tour-du-monde",
      "Le tour du monde",
      "40 075 km — la boucle est bouclée.",
      "Globe2",
      Math.round(s.km),
      40_075,
    ),
    def("passeport-tamponne", "Passeport tamponné", "5 pays visités.", "Stamp", s.countries, 5),
    def("mappemonde", "Mappemonde", "15 pays visités.", "Map", s.countries, 15),
    // Contribution
    def(
      "passepartout",
      "Passepartout",
      "15 choses ajoutées à la Valise — l'intendant fidèle.",
      "Briefcase",
      s.packItems,
      15,
    ),
    def("eclaireur", "Éclaireur", "10 idées proposées au groupe.", "Lightbulb", s.ideas, 10),
    def(
      "voix-equipage",
      "La voix de l'équipage",
      "15 votes — idées, sondages, hébergements.",
      "Vote",
      s.votes,
      15,
    ),
    def(
      "precaution-fogg",
      "Précaution de Fogg",
      "Fiche d'urgence remplie sur un voyage.",
      "ShieldCheck",
      s.emergencySheets,
      1,
    ),
    def("archiviste", "Archiviste", "10 documents déposés.", "Archive", s.documents, 10),
    // Mémoire
    def(
      "chroniqueur",
      "Chroniqueur de bord",
      "5 pages de journal écrites.",
      "Feather",
      s.journalPages,
      5,
    ),
    def("daguerreotypiste", "Daguerréotypiste", "20 photos partagées.", "Camera", s.photos, 20),
  ];
}
