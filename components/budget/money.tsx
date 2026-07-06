"use client";

import { useLocale } from "@/components/i18n/provider";
import { intlLocale } from "@/lib/i18n/dates";
import { cn } from "@/lib/utils";

export function fmtMoney(n: number, currency: string, il: string): string {
  return `${n.toLocaleString(il, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

/**
 * Montant en double devise (PHIL-P01) : la principale en gros,
 * la secondaire en petit dessous.
 */
export function Money({
  amount,
  currency,
  secondaryAmount,
  secondaryCurrency,
  align = "end",
  className,
  title,
}: {
  amount: number;
  currency: string;
  secondaryAmount?: number | null;
  secondaryCurrency?: string | null;
  align?: "start" | "end";
  className?: string;
  title?: string;
}) {
  const il = intlLocale(useLocale());
  return (
    <span
      className={cn(
        "inline-flex flex-col",
        align === "end" ? "items-end" : "items-start",
        className,
      )}
      title={title}
    >
      <span>{fmtMoney(amount, currency, il)}</span>
      {secondaryAmount !== null && secondaryAmount !== undefined && secondaryCurrency ? (
        <span className="text-[0.7em] font-normal text-encre-douce">
          ≈ {fmtMoney(secondaryAmount, secondaryCurrency, il)}
        </span>
      ) : null}
    </span>
  );
}
