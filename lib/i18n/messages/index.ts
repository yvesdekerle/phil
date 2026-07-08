import { lookup } from "../translate";
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

/** Fusion profonde : `over` recouvre `base` récursivement (objets uniquement). */
function deepMerge<T>(base: T, over: unknown): T {
  if (over == null || typeof over !== "object" || Array.isArray(over)) {
    return base;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    const b = out[k];
    out[k] =
      b && typeof b === "object" && !Array.isArray(b) && v && typeof v === "object"
        ? deepMerge(b, v)
        : v;
  }
  return out as T;
}

/**
 * Dictionnaire **complet** de la langue active, repli français fusionné dessous
 * (PHIL-R19). Sérialisé tel quel vers le client : il n'a alors plus besoin du
 * catalogue fr pour combler les clés non traduites → rien de tout ça dans le
 * bundle JS client. Pour `fr`, c'est la source déjà complète.
 */
export function completeMessages(locale: "fr" | "en" | "es"): Messages {
  return locale === "fr" ? fr : deepMerge(fr, messages[locale]);
}

/**
 * Traducteur **serveur** : `t("nav.trips")`. Cherche dans la langue active,
 * **retombe sur le français** si la clé manque, puis sur la clé brute. (Côté
 * client, `makeTranslator` de `../translate` opère sur un dict déjà complet.)
 */
export function translator(dict: unknown, fallback: Messages = fr) {
  return (key: string): string => lookup(dict, key) ?? lookup(fallback, key) ?? key;
}
