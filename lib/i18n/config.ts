/** Configuration i18n (PHIL-Q37). Langue pilotée par le profil, via cookie. */
export const locales = ["en", "fr", "es"] as const;
export type Locale = (typeof locales)[number];
/** Anglais-first (PHIL-R19b) : défaut sans cookie + langue de repli. */
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "fr" || value === "en" || value === "es";
}
