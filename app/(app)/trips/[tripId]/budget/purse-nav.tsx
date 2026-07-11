import { Lock } from "lucide-react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

/** Navigation de la Bourse (PHIL-Q21) : Dépenses | Équilibre | Suivi. */
export async function PurseNav({
  tripId,
  active,
  closed,
}: {
  tripId: string;
  active: "depenses" | "equilibre" | "suivi";
  closed: boolean;
}) {
  const t = await getT();
  const pill = (href: string, label: string, isActive: boolean) => (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1",
        isActive
          ? "bg-lagoon-ink font-medium text-card"
          : "text-slate hover:bg-citron/10 hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav
      className="flex flex-wrap items-center gap-1 text-sm"
      aria-label={t("budget.nav.ariaLabel")}
    >
      {pill(
        `/trips/${tripId}/budget?tab=depenses`,
        t("budget.nav.expenses"),
        active === "depenses",
      )}
      {pill(`/trips/${tripId}/budget/equilibre`, t("budget.nav.balance"), active === "equilibre")}
      {pill(`/trips/${tripId}/budget/depenses`, t("budget.nav.tracking"), active === "suivi")}
      {closed ? (
        <span className="ml-1 flex items-center gap-1 rounded-full bg-ink/10 px-2.5 py-1 text-xs text-slate">
          <Lock className="size-3" aria-hidden="true" /> {t("budget.nav.closed")}
        </span>
      ) : null}
    </nav>
  );
}
