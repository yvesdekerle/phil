"use client";

import { useEffect, useId, useState } from "react";
import { useLocale } from "@/components/i18n/provider";
import { Input } from "@/components/ui/input";

type Props = React.ComponentProps<typeof Input>;

/**
 * Champ devise (PHIL-Q04, liste complète PHIL-Q37c) — code ISO 3 lettres, avec
 * la liste ISO 4217 complète en suggestions (noms localisés via Intl). La saisie
 * libre reste possible. La liste est calculée côté client uniquement : `Intl`
 * ne renvoie pas les mêmes libellés côté serveur (Node) et navigateur → mismatch
 * d'hydratation évité.
 */
export function CurrencyInput(props: Props) {
  const listId = useId();
  const locale = useLocale();
  const [options, setOptions] = useState<{ code: string; name: string }[]>([]);

  useEffect(() => {
    const codes = Intl.supportedValuesOf("currency");
    const names = new Intl.DisplayNames([locale], { type: "currency" });
    setOptions(codes.map((code) => ({ code, name: names.of(code) ?? code })));
  }, [locale]);

  return (
    <>
      <Input maxLength={3} autoComplete="off" {...props} list={listId} />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.name}
          </option>
        ))}
      </datalist>
    </>
  );
}
