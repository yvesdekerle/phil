"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * Navigation du voyage « Lagune vive » (handoff §4 + B9) — deux rendus du même
 * modèle : `TripTabBar` (mobile, barre basse fixe, 5 items max, soulignement
 * citron sous le label) et `TripSidebar` (desktop ≥ 1024, colonne 220 fixe).
 * Nouveauté = point berry 8 cerclé sand, jamais de compteur chiffré.
 */

type Pending = { ideas: number; polls: number };

/** Onglets primaires (barre mobile + tête de sidebar). */
const PRIMARY = [
  { segment: "", key: "calendar" },
  { segment: "budget", key: "budget" },
  { segment: "ideas", key: "ideas" },
] as const;

/** Rubriques de la grille « Plus » (et corps de la sidebar). */
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

/** Le Journal couvre ses sous-vues et les fiches d'événements. */
const JOURNAL_CHILDREN = ["timeline", "map", "day", "events"];

function useTripNav(tripId: string) {
  const pathname = usePathname();
  const base = `/trips/${tripId}`;
  const rest = pathname === base ? "" : pathname.slice(base.length + 1);
  const head = rest.split("/")[0] ?? "";

  const activeSegment = (segment: string): boolean => {
    if (segment === "") {
      return rest === "" || JOURNAL_CHILDREN.includes(head);
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
  return false;
}

/** B9 — barre d'onglets basse (mobile) : Journal · Bourse · Idées · Plus · Profil. */
export function TripTabBar({ tripId, pending }: { tripId: string; pending?: Pending }) {
  const t = useT();
  const { base, head, activeSegment } = useTripNav(tripId);

  const inPlus = head === "plus" || RUBRIQUES.some((r) => r.segment === head);
  const items = [
    ...PRIMARY.map((item) => ({
      key: item.key,
      href: item.segment ? `${base}/${item.segment}` : base,
      active: activeSegment(item.segment),
      dot: pendingDot(item.key, pending),
    })),
    {
      key: "plus",
      href: `${base}/plus`,
      active: inPlus,
      dot: pendingDot("polls", pending),
    },
    { key: "profile", href: "/profile", active: false, dot: false },
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

/** Sidebar 220 fixe (desktop ≥ 1024) — mêmes entrées, rubriques à plat. */
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
        <div className="flex flex-col gap-0.5">{PRIMARY.map(renderItem)}</div>
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
