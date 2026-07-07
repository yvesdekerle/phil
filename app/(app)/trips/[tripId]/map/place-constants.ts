// Constantes partagées serveur/client — HORS du fichier "use server" (un module
// d'actions ne peut exporter que des fonctions async ; une constante importée
// côté client y devient un proxy inutilisable). PHIL-S02.
export const PLACE_CATEGORIES = ["SUPERMARKET", "SHOP", "PHARMACY", "MARKET", "OTHER"] as const;
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];
