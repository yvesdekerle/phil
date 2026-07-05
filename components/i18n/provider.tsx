"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import { messages, type PartialMessages, translator } from "@/lib/i18n/messages";

type Ctx = { locale: Locale; dict: PartialMessages };
const I18nContext = createContext<Ctx>({ locale: "fr", dict: messages.fr });

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
  return useMemo(() => translator(dict), [dict]);
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}
