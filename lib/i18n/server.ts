import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { dateFnsLocale, intlLocale } from "./dates";
import { messages, translator } from "./messages";

/** Langue courante (cookie NEXT_LOCALE, synchronisé sur profiles.locale). */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

/** Traducteur côté serveur (Server Components, actions). */
export async function getT() {
  const locale = await getLocale();
  return translator(messages[locale]);
}

/** Locale `date-fns` courante (noms de jours/mois) — Server Components. */
export async function getDateFnsLocale() {
  return dateFnsLocale(await getLocale());
}

/** Identifiant BCP-47 courant pour `Intl` (ex. "fr-FR", "en-GB"). */
export async function getIntlLocale() {
  return intlLocale(await getLocale());
}
