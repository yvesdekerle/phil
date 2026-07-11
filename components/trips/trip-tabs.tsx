"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n/provider";
import { cn } from "@/lib/utils";

const TABS = [
  { segment: "", key: "calendar" },
  { segment: "ideas", key: "ideas" },
  { segment: "miam", key: "miam" },
  { segment: "polls", key: "polls" },
  { segment: "documents", key: "documents" },
  { segment: "lodging", key: "lodging" },
  { segment: "checklist", key: "checklist" },
  { segment: "photos", key: "photos" },
  { segment: "budget", key: "budget" },
  { segment: "participants", key: "participants" },
  { segment: "guide", key: "guide" },
  { segment: "settings", key: "settings" },
] as const;

type PendingByTab = { ideas: number; polls: number };

export function TripTabs({ tripId, pending }: { tripId: string; pending?: PendingByTab }) {
  const pathname = usePathname();
  const t = useT();
  const base = `/trips/${tripId}`;
  const badgeFor = (key: string): number =>
    pending && (key === "ideas" || key === "polls") ? pending[key] : 0;

  return (
    <nav
      aria-label={t("tripTabs.aria")}
      className="scrollbar-none -mb-px flex gap-1 overflow-x-auto"
    >
      {TABS.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        // Le Calendrier couvre aussi sa sous-vue Timeline (/trips/[id]/timeline).
        const active =
          tab.segment === ""
            ? pathname === base || pathname === `${base}/timeline`
            : pathname === href;
        const badge = badgeFor(tab.key);
        return (
          <Link
            key={tab.key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mist",
              active
                ? "border-lagoon-ink font-medium text-lagoon-ink"
                : "border-transparent text-slate hover:border-line hover:text-ink",
            )}
          >
            {t(`tripTabs.${tab.key}`)}
            {badge > 0 ? (
              <span
                role="img"
                className="flex min-w-4 items-center justify-center rounded-full bg-lagoon-ink px-1 text-[0.65rem] font-semibold text-card"
                aria-label={t("pending.tabAria").replace("{n}", String(badge))}
              >
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
