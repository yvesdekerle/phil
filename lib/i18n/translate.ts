/**
 * Logique pure de traduction (PHIL-R19), **sans aucune donnée de messages** :
 * ce module est importé côté client (`I18nProvider`/`useT`) sans embarquer le
 * catalogue trilingue dans le bundle JS (~150 Ko économisés). Le dictionnaire
 * arrive par prop, sérialisé par le serveur — et déjà **complet** (repli fr
 * fusionné côté serveur via `completeMessages`), donc pas de repli ici.
 */

/** Recherche une clé pointée ("nav.trips") dans un dictionnaire imbriqué. */
export function lookup(dict: unknown, key: string): string | undefined {
  const value = key
    .split(".")
    .reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], dict);
  return typeof value === "string" ? value : undefined;
}

/** Traducteur sur un dictionnaire supposé complet : `t("nav.trips")`. */
export function makeTranslator(dict: unknown) {
  return (key: string): string => lookup(dict, key) ?? key;
}
