"use client";

import { useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { toggleVisitedCountry } from "./actions";

/** Suggestions "d'après tes voyages" (PHIL-P13). */
export function CountrySuggestions({
  suggestions,
}: {
  suggestions: { code: string; name: string }[];
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  if (suggestions.length === 0) {
    return null;
  }
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-encre-douce">
      {t("explorer.suggestionsPrefix")}
      {suggestions.map((s) => (
        <button
          key={s.code}
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await toggleVisitedCountry(s.code, true);
            })
          }
          className="rounded-full border border-laiton-clair bg-papier px-3 py-1 text-xs text-encre transition-colors hover:border-bordeaux hover:text-bordeaux"
        >
          + {s.name}
        </button>
      ))}
    </div>
  );
}
