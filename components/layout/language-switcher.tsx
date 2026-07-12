"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useLocale, useT } from "@/components/i18n/provider";
import { setLocale } from "@/lib/i18n/actions";
import { type Locale, locales } from "@/lib/i18n/config";

const FLAGS: Record<Locale, { flag: string; label: string }> = {
  fr: { flag: "🇫🇷", label: "Français" },
  en: { flag: "🇬🇧", label: "English" },
  es: { flag: "🇪🇸", label: "Español" },
};

/** Sélecteur de langue à drapeaux, dans le header (PHIL-Q37). */
export function LanguageSwitcher() {
  const t = useT();
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={current}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as Locale;
        if (next === current) return;
        startTransition(async () => {
          await setLocale(next);
          router.refresh();
        });
      }}
      aria-label={t("nav.language")}
      title={t("nav.language")}
      className="h-8 cursor-pointer rounded-full border border-line bg-card px-2 text-sm text-ink transition-colors hover:border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mist disabled:opacity-60"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {FLAGS[l].flag} {FLAGS[l].label}
        </option>
      ))}
    </select>
  );
}
