"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n/provider";

/**
 * Header compact de voyage (prototype, « trip header shared ») — kicker
 * mono-caps « ← NOM DU VOYAGE » qui remonte à Mes voyages, puis le titre de
 * la section courante. Remplace la grande carte cover du design v1 (la photo
 * vit sur la carte héro de Mes voyages et dans les Réglages).
 */
const SEGMENT_KEYS: Record<string, string> = {
  "": "calendar",
  timeline: "calendar",
  day: "calendar",
  events: "calendar",
  map: "map",
  budget: "budget",
  ideas: "ideas",
  plus: "plus",
  polls: "polls",
  lodging: "lodging",
  miam: "miam",
  checklist: "checklist",
  photos: "photos",
  documents: "documents",
  guide: "guide",
  participants: "participants",
  emergency: "emergency",
  settings: "settings",
};

export function TripPageHeader({ tripId, tripName }: { tripId: string; tripName: string }) {
  const pathname = usePathname();
  const t = useT();
  const base = `/trips/${tripId}`;
  const rest = pathname === base ? "" : pathname.slice(base.length + 1);
  const head = rest.split("/")[0] ?? "";
  const key = SEGMENT_KEYS[head] ?? "calendar";

  return (
    <div className="mb-4 print:hidden">
      <Link
        href="/trips"
        className="inline-flex items-center gap-1 rounded-sm font-mono text-label text-mist uppercase tabular-nums transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
      >
        <ChevronLeft aria-hidden="true" className="size-3" />
        {tripName}
      </Link>
      <h1 className="mt-0.5 text-title text-ink">{t(`tripTabs.${key}`)}</h1>
    </div>
  );
}
