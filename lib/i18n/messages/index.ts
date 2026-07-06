import { en as enShell } from "./en";
import { budgetEn } from "./en/budget";
import { calendarEn } from "./en/calendar";
import { checklistEn } from "./en/checklist";
import { emailEn } from "./en/email";
import { geoEn } from "./en/geo";
import { metaEn } from "./en/meta";
import { profileEn } from "./en/profile";
import { publicEn } from "./en/public";
import { vaultEn } from "./en/vault";
import { es as esShell } from "./es";
import { budgetEs } from "./es/budget";
import { calendarEs } from "./es/calendar";
import { checklistEs } from "./es/checklist";
import { emailEs } from "./es/email";
import { geoEs } from "./es/geo";
import { metaEs } from "./es/meta";
import { profileEs } from "./es/profile";
import { publicEs } from "./es/public";
import { vaultEs } from "./es/vault";
import { fr as frShell } from "./fr";
import { budgetFr } from "./fr/budget";
import { calendarFr } from "./fr/calendar";
import { checklistFr } from "./fr/checklist";
import { emailFr } from "./fr/email";
import { geoFr } from "./fr/geo";
import { metaFr } from "./fr/meta";
import { profileFr } from "./fr/profile";
import { publicFr } from "./fr/public";
import { vaultFr } from "./fr/vault";

/**
 * Dictionnaire complet (PHIL-Q37). Le français (`fr`) est la source complète,
 * fusionnée depuis la coque + un fichier par écran (`fr/<cluster>.ts`).
 * L'anglais (`en`) est un sous-ensemble : ce qui manque retombe sur le français.
 */
export const fr = {
  ...frShell,
  ...budgetFr,
  ...calendarFr,
  ...checklistFr,
  ...emailFr,
  ...geoFr,
  ...metaFr,
  ...profileFr,
  ...publicFr,
  ...vaultFr,
};

export type Messages = typeof fr;

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
export type PartialMessages = DeepPartial<Messages>;

export const en: PartialMessages = {
  ...enShell,
  ...budgetEn,
  ...calendarEn,
  ...checklistEn,
  ...emailEn,
  ...geoEn,
  ...metaEn,
  ...profileEn,
  ...publicEn,
  ...vaultEn,
};

export const es: PartialMessages = {
  ...esShell,
  ...budgetEs,
  ...calendarEs,
  ...checklistEs,
  ...emailEs,
  ...geoEs,
  ...metaEs,
  ...profileEs,
  ...publicEs,
  ...vaultEs,
};

export const messages: { fr: Messages; en: PartialMessages; es: PartialMessages } = { fr, en, es };

function lookup(dict: unknown, key: string): string | undefined {
  const value = key
    .split(".")
    .reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], dict);
  return typeof value === "string" ? value : undefined;
}

/**
 * Traducteur : `t("nav.trips")`. Cherche dans la langue active, **retombe sur
 * le français** si la clé manque (traduction en cours), puis sur la clé brute.
 */
export function translator(dict: unknown, fallback: Messages = fr) {
  return (key: string): string => lookup(dict, key) ?? lookup(fallback, key) ?? key;
}
