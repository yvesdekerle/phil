"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";

/** Devises courantes proposées (PHIL-Q04) — la saisie libre reste possible. */
const COMMON_CURRENCIES: [string, string][] = [
  ["EUR", "Euro"],
  ["USD", "Dollar américain"],
  ["GBP", "Livre sterling"],
  ["CHF", "Franc suisse"],
  ["MUR", "Roupie mauricienne"],
  ["MAD", "Dirham marocain"],
  ["TND", "Dinar tunisien"],
  ["THB", "Baht thaïlandais"],
  ["IDR", "Roupie indonésienne"],
  ["VND", "Dong vietnamien"],
  ["JPY", "Yen japonais"],
  ["CNY", "Yuan chinois"],
  ["INR", "Roupie indienne"],
  ["LKR", "Roupie srilankaise"],
  ["CAD", "Dollar canadien"],
  ["AUD", "Dollar australien"],
  ["NZD", "Dollar néo-zélandais"],
  ["BRL", "Réal brésilien"],
  ["MXN", "Peso mexicain"],
  ["ARS", "Peso argentin"],
  ["CLP", "Peso chilien"],
  ["PEN", "Sol péruvien"],
  ["COP", "Peso colombien"],
  ["ZAR", "Rand sud-africain"],
  ["KES", "Shilling kényan"],
  ["TZS", "Shilling tanzanien"],
  ["EGP", "Livre égyptienne"],
  ["TRY", "Livre turque"],
  ["NOK", "Couronne norvégienne"],
  ["SEK", "Couronne suédoise"],
  ["DKK", "Couronne danoise"],
  ["ISK", "Couronne islandaise"],
  ["CZK", "Couronne tchèque"],
  ["HUF", "Forint hongrois"],
  ["PLN", "Zloty polonais"],
  ["AED", "Dirham émirati"],
  ["SGD", "Dollar de Singapour"],
  ["HKD", "Dollar de Hong Kong"],
  ["KRW", "Won sud-coréen"],
  ["PHP", "Peso philippin"],
];

type Props = React.ComponentProps<typeof Input>;

/** Champ devise avec suggestions (datalist) — code ISO 3 lettres. */
export function CurrencyInput(props: Props) {
  const listId = useId();
  return (
    <>
      <Input maxLength={3} autoComplete="off" {...props} list={listId} />
      <datalist id={listId}>
        {COMMON_CURRENCIES.map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </datalist>
    </>
  );
}
