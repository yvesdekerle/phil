"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n/provider";
import { cn } from "@/lib/utils";

const TABS = [
  { segment: "", key: "calendar" },
  { segment: "lodging", key: "lodging" },
  { segment: "documents", key: "documents" },
  { segment: "ideas", key: "ideas" },
  { segment: "polls", key: "polls" },
  { segment: "checklist", key: "checklist" },
  { segment: "photos", key: "photos" },
  { segment: "budget", key: "budget" },
  { segment: "participants", key: "participants" },
  { segment: "settings", key: "settings" },
] as const;

export function TripTabs({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const t = useT();
  const base = `/trips/${tripId}`;

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
        return (
          <Link
            key={tab.key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laiton",
              active
                ? "border-bordeaux font-medium text-bordeaux"
                : "border-transparent text-encre-douce hover:border-laiton-clair hover:text-encre",
            )}
          >
            {t(`tripTabs.${tab.key}`)}
          </Link>
        );
      })}
    </nav>
  );
}
