/** Configuration i18n (PHIL-Q37). Langue pilotée par le profil, via cookie. */
export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "fr" || value === "en";
}
