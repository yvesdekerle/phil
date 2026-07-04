"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { segment: "", label: "Calendrier" },
  { segment: "map", label: "Carte" },
  { segment: "documents", label: "Documents" },
  { segment: "ideas", label: "Idées" },
  { segment: "checklist", label: "Valise" },
  { segment: "photos", label: "Photos" },
  { segment: "budget", label: "Bourse" },
  { segment: "participants", label: "Participants" },
  { segment: "settings", label: "Paramètres" },
] as const;

export function TripTabs({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const base = `/trips/${tripId}`;

  return (
    <nav
      aria-label="Sections du voyage"
      className="scrollbar-none -mb-px flex gap-1 overflow-x-auto"
    >
      {TABS.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        const active = pathname === href;
        return (
          <Link
            key={tab.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laiton",
              active
                ? "border-bordeaux font-medium text-bordeaux"
                : "border-transparent text-encre-douce hover:border-laiton-clair hover:text-encre",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
