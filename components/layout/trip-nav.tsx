"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * Navigation du voyage « Lagune vive » (prototypes + déclinaisons hifi) —
 * deux rendus du même modèle :
 * `TripTabBar` (mobile) : Programme · Carte · Bourse · Plus (4 items, canon
 * B9 — soulignement citron sous le label, point berry sans compteur ; les
 * Idées et les rubriques vivent sous « Plus ») ;
 * `TripSidebar` (desktop ≥ 1024) : colonne 220 fixe, toutes les entrées à
 * plat (pas de menu « Plus » en desktop).
 */

type Pending = { ideas: number; polls: number };

/** Barre mobile : 4 onglets (les rubriques passent par « Plus »). */
const TAB_BAR = [
  { segment: "", key: "calendar" },
  { segment: "map", key: "map" },
  { segment: "budget", key: "budget" },
] as const;

/** Tête de sidebar desktop : Programme · Carte · Bourse · Idées. */
const SIDEBAR_PRIMARY = [
  { segment: "", key: "calendar" },
  { segment: "map", key: "map" },
  { segment: "budget", key: "budget" },
  { segment: "ideas", key: "ideas" },
] as const;

/** Rubriques (grille « Plus » mobile et corps de sidebar desktop). */
export const RUBRIQUES = [
  { segment: "polls", key: "polls" },
  { segment: "lodging", key: "lodging" },
  { segment: "miam", key: "miam" },
  { segment: "checklist", key: "checklist" },
  { segment: "photos", key: "photos" },
  { segment: "documents", key: "documents" },
  { segment: "guide", key: "guide" },
  { segment: "participants", key: "participants" },
  { segment: "emergency", key: "emergency" },
  { segment: "settings", key: "settings" },
] as const;

/** Le Programme couvre ses sous-vues et les fiches d'événements. */
const PROGRAMME_CHILDREN = ["timeline", "day", "events"];

function useTripNav(tripId: string) {
  const pathname = usePathname();
  const base = `/trips/${tripId}`;
  const rest = pathname === base ? "" : pathname.slice(base.length + 1);
  const head = rest.split("/")[0] ?? "";

  const activeSegment = (segment: string): boolean => {
    if (segment === "") {
      return rest === "" || PROGRAMME_CHILDREN.includes(head);
    }
    return head === segment;
  };
  return { base, head, activeSegment };
}

function BerryDot() {
  return (
    <span
      aria-hidden="true"
      className="absolute -top-0.5 -right-2.5 size-2 rounded-full bg-berry ring-2 ring-sand"
    />
  );
}

function pendingDot(key: string, pending?: Pending): boolean {
  if (!pending) {
    return false;
  }
  if (key === "ideas") {
    return pending.ideas > 0;
  }
  if (key === "polls") {
    return pending.polls > 0;
  }
  if (key === "plus") {
    return pending.ideas > 0 || pending.polls > 0;
  }
  return false;
}

/** B9 — barre d'onglets basse (mobile) : Programme · Carte · Bourse · Plus. */
export function TripTabBar({ tripId, pending }: { tripId: string; pending?: Pending }) {
  const t = useT();
  const { base, head, activeSegment } = useTripNav(tripId);

  const inPlus = head === "plus" || head === "ideas" || RUBRIQUES.some((r) => r.segment === head);
  const items = [
    ...TAB_BAR.map((item) => ({
      key: item.key,
      href: item.segment ? `${base}/${item.segment}` : base,
      active: activeSegment(item.segment),
      dot: false,
    })),
    {
      key: "plus",
      href: `${base}/plus`,
      active: inPlus,
      dot: pendingDot("plus", pending),
    },
  ];

  return (
    <nav
      aria-label={t("tripTabs.aria")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-sand pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden"
    >
      <div className="mx-auto flex h-14 w-full max-w-content items-stretch">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-caption font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-inset",
              item.active ? "text-ink" : "text-slate",
            )}
          >
            <span className="relative">
              {t(`tripTabs.${item.key}`)}
              {item.dot && <BerryDot />}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "h-[3px] w-5 rounded-[3px] bg-citron transition-opacity",
                item.active ? "opacity-100" : "opacity-0",
              )}
            />
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** Sidebar 220 fixe (desktop ≥ 1024) — toutes les entrées à plat. */
export function TripSidebar({ tripId, pending }: { tripId: string; pending?: Pending }) {
  const t = useT();
  const { base, activeSegment } = useTripNav(tripId);

  const itemClass = (active: boolean) =>
    cn(
      "relative flex h-9 items-center rounded-md px-2.5 text-body transition-colors outline-none focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand",
      active ? "bg-wash font-semibold text-ink" : "text-slate hover:bg-wash/70 hover:text-ink",
    );

  const renderItem = (item: { segment: string; key: string }) => {
    const active = activeSegment(item.segment);
    return (
      <Link
        key={item.key}
        href={item.segment ? `${base}/${item.segment}` : base}
        aria-current={active ? "page" : undefined}
        className={itemClass(active)}
      >
        <span className="relative">
          {t(`tripTabs.${item.key}`)}
          {pendingDot(item.key, pending) && <BerryDot />}
        </span>
      </Link>
    );
  };

  return (
    <aside className="hidden w-55 shrink-0 lg:block print:hidden">
      <nav aria-label={t("tripTabs.aria")} className="sticky top-6 flex flex-col gap-5">
        <div className="flex flex-col gap-0.5">{SIDEBAR_PRIMARY.map(renderItem)}</div>
        <div className="flex flex-col gap-0.5">
          <p className="mb-1 px-2.5 font-mono text-label text-mist uppercase">
            {t("tripTabs.plus")}
          </p>
          {RUBRIQUES.map(renderItem)}
        </div>
      </nav>
    </aside>
  );
}
