import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";
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
