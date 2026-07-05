"use client";

import { useId } from "react";
import { useT } from "@/components/i18n/provider";
import { Input } from "@/components/ui/input";

/** Codes des devises courantes proposées (PHIL-Q04) — la saisie libre reste possible. */
const COMMON_CURRENCIES = [
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "MUR",
  "MAD",
  "TND",
  "THB",
  "IDR",
  "VND",
  "JPY",
  "CNY",
  "INR",
  "LKR",
  "CAD",
  "AUD",
  "NZD",
  "BRL",
  "MXN",
  "ARS",
  "CLP",
  "PEN",
  "COP",
  "ZAR",
  "KES",
  "TZS",
  "EGP",
  "TRY",
  "NOK",
  "SEK",
  "DKK",
  "ISK",
  "CZK",
  "HUF",
  "PLN",
  "AED",
  "SGD",
  "HKD",
  "KRW",
  "PHP",
];

type Props = React.ComponentProps<typeof Input>;

/** Champ devise avec suggestions (datalist) — code ISO 3 lettres. */
export function CurrencyInput(props: Props) {
  const listId = useId();
  const t = useT();
  return (
    <>
      <Input maxLength={3} autoComplete="off" {...props} list={listId} />
      <datalist id={listId}>
        {COMMON_CURRENCIES.map((code) => (
          <option key={code} value={code}>
            {t(`budget.currencies.${code}`)}
          </option>
        ))}
      </datalist>
    </>
  );
}
