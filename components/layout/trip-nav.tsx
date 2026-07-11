"use client";

import { Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * Navigation du voyage « Lagune vive » (prototypes + déclinaison L2d) :
 * `TripTabBar` (mobile) — barre basse Programme · Carte · Dépenses · Plus,
 * soulignement citron sous le label, point berry sans compteur ;
 * `TripSidebar` (desktop ≥ 1024) — **sidebar sombre 220 pleine hauteur** :
 * marque Phil (clic → Mes voyages), carte du voyage courant, rubriques à plat
 * en 3 blocs séparés d'un filet, Coffre + profil en pied.
 */

type Pending = { ideas: number; polls: number };

/** Barre mobile : 4 onglets (les rubriques passent par « Plus »). */
const TAB_BAR = [
  { segment: "", key: "calendar" },
  { segment: "map", key: "map" },
  { segment: "budget", key: "budget" },
] as const;

/**
 * Sidebar desktop — 3 blocs à plat (canon L2d, réordonnés retour v2 PHIL-V06a) :
 * bloc 1 = Programme · Carte · Documents · Idées, les Dépenses ouvrent le bloc 2.
 */
const SIDEBAR_BLOCKS: { segment: string; key: string }[][] = [
  [
    { segment: "", key: "calendar" },
    { segment: "map", key: "map" },
    { segment: "documents", key: "documents" },
    { segment: "ideas", key: "ideas" },
  ],
  [
    { segment: "budget", key: "budget" },
    { segment: "polls", key: "polls" },
    { segment: "lodging", key: "lodging" },
    { segment: "miam", key: "miam" },
    { segment: "checklist", key: "checklist" },
    { segment: "photos", key: "photos" },
    { segment: "participants", key: "participants" },
  ],
  [
    { segment: "guide", key: "guide" },
    { segment: "emergency", key: "emergency" },
    { segment: "settings", key: "settings" },
  ],
];

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

/** B9 — barre d'onglets basse (mobile) : Programme · Carte · Dépenses · Plus. */
export function TripTabBar({ tripId, pending }: { tripId: string; pending?: Pending }) {
  const t = useT();
  const { base, head, activeSegment } = useTripNav(tripId);

  const inPlus =
    head === "plus" ||
    head === "ideas" ||
    SIDEBAR_BLOCKS.flat().some(
      (r) => r.segment === head && !TAB_BAR.some((p) => p.segment === head),
    );
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
              {item.dot && (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-2.5 size-2 rounded-full bg-berry ring-2 ring-sand"
                />
              )}
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

/** Sidebar sombre 220 (desktop ≥ 1024, canon L2d). */
export function TripSidebar({
  tripId,
  tripName,
  tripMeta,
  pending,
  avatarUrl,
  initial,
  userName,
}: {
  tripId: string;
  tripName: string;
  /** Ex. « 6 → 20 NOV · 9 À BORD » */
  tripMeta: string;
  pending?: Pending;
  avatarUrl: string | null;
  initial: string;
  userName: string;
}) {
  const t = useT();
  const { base, activeSegment } = useTripNav(tripId);

  const renderItem = (item: { segment: string; key: string }) => {
    const active = activeSegment(item.segment);
    return (
      <Link
        key={item.key}
        href={item.segment ? `${base}/${item.segment}` : base}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex min-h-8 items-center justify-between rounded-md px-2.5 text-body font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-citron",
          active
            ? "bg-white/10 font-bold text-white"
            : "text-lagoon-soft hover:bg-white/5 hover:text-white",
        )}
      >
        {active ? (
          <span
            aria-hidden="true"
            className="absolute top-1.5 bottom-1.5 -left-3 w-[3px] rounded-r-[3px] bg-citron"
          />
        ) : null}
        {t(`tripTabs.${item.key}`)}
        {pendingDot(item.key, pending) ? (
          <span aria-hidden="true" className="size-1.5 rounded-full bg-berry" />
        ) : null}
      </Link>
    );
  };

  return (
    <aside className="sticky top-0 hidden h-dvh w-55 shrink-0 flex-col overflow-y-auto bg-ink px-3 pt-4 pb-3.5 lg:flex print:hidden">
      <Link
        href="/trips"
        className="mx-2 w-fit rounded-sm text-xl font-extrabold tracking-tight text-white outline-none focus-visible:ring-2 focus-visible:ring-citron"
      >
        Phil
      </Link>
      <div className="mt-4 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5">
        <p className="truncate text-subhead text-white">{tripName}</p>
        <p className="mt-0.5 truncate font-mono text-label text-lagoon-soft uppercase tabular-nums">
          {tripMeta}
        </p>
      </div>
      <nav aria-label={t("tripTabs.aria")} className="mt-3.5 flex flex-col gap-0.5">
        {SIDEBAR_BLOCKS.map((block, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: blocs statiques
          <div key={i} className="flex flex-col gap-0.5">
            {i > 0 ? <div aria-hidden="true" className="mx-2.5 my-2 h-px bg-white/10" /> : null}
            {block.map(renderItem)}
          </div>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-3 border-t border-white/15 px-2 pt-3">
        <Link
          href="/vault"
          className="inline-flex w-fit items-center gap-2.5 rounded-sm text-ui font-bold text-wash transition-colors outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-citron"
        >
          <Lock className="size-4" aria-hidden="true" />
          {t("nav.vault")}
        </Link>
        <Link
          href="/profile"
          className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-citron"
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={28}
              height={28}
              className="rounded-full border border-white/20"
            />
          ) : (
            <span className="flex size-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-caption font-bold text-white">
              {initial}
            </span>
          )}
          <span className="truncate text-caption font-bold text-white">{userName}</span>
        </Link>
      </div>
    </aside>
  );
}
