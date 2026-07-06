import type { Locale as DateFnsLocale } from "date-fns";
import { enGB, fr } from "date-fns/locale";
import type { Locale } from "./config";

/**
 * Localisation des dates (PHIL-Q37) — dernière pièce d'infra : mappe la langue
 * de l'app vers la locale `date-fns` (noms de jours/mois) et vers un identifiant
 * BCP-47 pour `Intl`. Ajouter une langue = ajouter une branche ici.
 */
export function dateFnsLocale(locale: Locale): DateFnsLocale {
  return locale === "en" ? enGB : fr;
}

export function intlLocale(locale: Locale): string {
  return locale === "en" ? "en-GB" : "fr-FR";
}
