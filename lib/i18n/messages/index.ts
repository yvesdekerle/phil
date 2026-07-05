import type { Locale } from "../config";
import { en } from "./en";
import { fr, type Messages } from "./fr";

export type { Messages };
export const messages: Record<Locale, Messages> = { fr, en };

/** Traducteur : `t("nav.trips")`. Renvoie la clé si absente (fail-visible). */
export function translator(dict: Messages) {
  return (key: string): string => {
    const value = key
      .split(".")
      .reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], dict);
    return typeof value === "string" ? value : key;
  };
}
