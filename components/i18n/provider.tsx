"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { PartialMessages } from "@/lib/i18n/messages";
import { makeTranslator } from "@/lib/i18n/translate";

type Ctx = { locale: Locale; dict: PartialMessages };
// Dict vide par défaut : le provider reçoit toujours un dict complet en prop
// (sérialisé par le serveur). Aucun catalogue de messages dans le bundle client.
const I18nContext = createContext<Ctx>({ locale: "fr", dict: {} });

/**
 * Fournit la langue + les messages actifs aux composants client (PHIL-Q37).
 * Le serveur ne sérialise que le dictionnaire de la langue courante.
 */
export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: PartialMessages;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ locale, dict }), [locale, dict]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Hook de traduction : `const t = useT(); t("nav.trips")`. */
export function useT() {
  const { dict } = useContext(I18nContext);
  return useMemo(() => makeTranslator(dict), [dict]);
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}
