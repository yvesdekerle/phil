import { Lock } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

/**
 * Navigation de la Bourse (PHIL-Q21, canon L3a) — onglets texte soulignés
 * citron SOUS le mot : Dépenses · Équilibre · Suivi. Bourse close = badge mono.
 */
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
  const tab = (href: string, label: string, isActive: boolean) => (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative pb-2 transition-colors outline-none after:absolute after:inset-x-0 after:bottom-0 after:h-[2.5px] after:rounded-[3px] after:bg-citron after:opacity-0 after:transition-opacity focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand",
        isActive
          ? "text-body font-bold text-ink after:opacity-100"
          : "text-ui font-normal text-mist hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav
      className="flex items-end gap-4 border-b border-line"
      aria-label={t("budget.nav.ariaLabel")}
    >
      {tab(`/trips/${tripId}/budget?tab=depenses`, t("budget.nav.expenses"), active === "depenses")}
      {tab(`/trips/${tripId}/budget/equilibre`, t("budget.nav.balance"), active === "equilibre")}
      {tab(`/trips/${tripId}/budget/depenses`, t("budget.nav.tracking"), active === "suivi")}
      {closed ? (
        <Badge variant="neutral" className="mb-1.5 ml-auto">
          <Lock className="size-2.5" aria-hidden="true" /> {t("budget.nav.closed")}
        </Badge>
      ) : null}
    </nav>
  );
}
