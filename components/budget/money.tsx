import { cn } from "@/lib/utils";

export function fmtMoney(n: number, currency: string): string {
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
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
  return (
    <span
      className={cn(
        "inline-flex flex-col",
        align === "end" ? "items-end" : "items-start",
        className,
      )}
      title={title}
    >
      <span>{fmtMoney(amount, currency)}</span>
      {secondaryAmount !== null && secondaryAmount !== undefined && secondaryCurrency ? (
        <span className="text-[0.7em] font-normal text-encre-douce">
          ≈ {fmtMoney(secondaryAmount, secondaryCurrency)}
        </span>
      ) : null}
    </span>
  );
}
