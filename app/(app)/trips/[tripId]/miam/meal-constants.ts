// Constantes partagées serveur/client — HORS du fichier "use server" (voir
// place-constants.ts pour l'explication). PHIL-S01.
export const MEAL_SLOTS = ["BREAKFAST", "LUNCH", "DINNER", "OTHER"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];
