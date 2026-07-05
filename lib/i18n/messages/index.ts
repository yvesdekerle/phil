import { en } from "./en";
import { fr, type Messages } from "./fr";

export type { Messages };

/** L'anglais peut être un sous-ensemble : on le remplit écran par écran (PHIL-Q37). */
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
export type PartialMessages = DeepPartial<Messages>;

/** fr = source complète ; en = traductions disponibles (le reste retombe sur fr). */
export const messages: { fr: Messages; en: PartialMessages } = { fr, en };

function lookup(dict: unknown, key: string): string | undefined {
  const value = key
    .split(".")
    .reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], dict);
  return typeof value === "string" ? value : undefined;
}

/**
 * Traducteur : `t("nav.trips")`. Cherche dans la langue active, **retombe sur
 * le français** si la clé manque (traduction en cours), puis sur la clé brute.
 * Ce repli rend la traduction incrémentale sûre — un écran anglais pas encore
 * traduit s'affiche en français, jamais en `budget.someKey`.
 */
export function translator(dict: unknown, fallback: Messages = fr) {
  return (key: string): string => lookup(dict, key) ?? lookup(fallback, key) ?? key;
}
