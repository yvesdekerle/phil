import { Lock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Navigation de la Bourse (PHIL-Q21) : Dépenses | Équilibre | Suivi. */
export function PurseNav({
  tripId,
  active,
  closed,
}: {
  tripId: string;
  active: "depenses" | "equilibre" | "suivi";
  closed: boolean;
}) {
  const pill = (href: string, label: string, isActive: boolean) => (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1",
        isActive
          ? "bg-bordeaux font-medium text-papier"
          : "text-encre-douce hover:bg-laiton/10 hover:text-encre",
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Vues de la Bourse">
      {pill(`/trips/${tripId}/budget?tab=depenses`, "Dépenses", active === "depenses")}
      {pill(`/trips/${tripId}/budget/equilibre`, "Équilibre", active === "equilibre")}
      {pill(`/trips/${tripId}/budget/depenses`, "Suivi", active === "suivi")}
      {closed ? (
        <span className="ml-1 flex items-center gap-1 rounded-full bg-encre/10 px-2.5 py-1 text-xs text-encre-douce">
          <Lock className="size-3" aria-hidden="true" /> Bourse close
        </span>
      ) : null}
    </nav>
  );
}
