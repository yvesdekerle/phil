"use client";

import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n/provider";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

/**
 * Header de voyage canonique :
 * mobile (prototype) — kicker mono « ← NOM DU VOYAGE » (→ Mes voyages) +
 * titre de la section + avatar à droite (l'emplacement cloche viendra avec
 * PHIL-V04) ; desktop (L2d) — barre 60 sur fond card : titre + langue +
 * avatar (la sidebar sombre porte la marque et la nav).
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

function Avatar({
  avatarUrl,
  initial,
  size,
}: {
  avatarUrl: string | null;
  initial: string;
  size: number;
}) {
  return avatarUrl ? (
    <Image
      src={avatarUrl}
      alt=""
      width={size}
      height={size}
      className="rounded-full border border-line"
    />
  ) : (
    <span
      className="flex items-center justify-center rounded-full bg-ink text-caption font-bold text-white"
      style={{ width: size, height: size }}
    >
      {initial}
    </span>
  );
}

export function TripPageHeader({
  tripId,
  tripName,
  avatarUrl,
  initial,
}: {
  tripId: string;
  tripName: string;
  avatarUrl: string | null;
  initial: string;
}) {
  const pathname = usePathname();
  const t = useT();
  const base = `/trips/${tripId}`;
  const rest = pathname === base ? "" : pathname.slice(base.length + 1);
  const head = rest.split("/")[0] ?? "";
  const key = SEGMENT_KEYS[head] ?? "calendar";
  const title = t(`tripTabs.${key}`);

  return (
    <>
      {/* Mobile — kicker + titre + avatar */}
      <div className="flex items-start justify-between gap-3 px-4 pt-2 pb-3 lg:hidden print:hidden">
        <div className="min-w-0">
          <Link
            href="/trips"
            className="inline-flex items-center gap-1 rounded-sm font-mono text-label text-mist uppercase tabular-nums transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
          >
            <ChevronLeft aria-hidden="true" className="size-3" />
            {tripName}
          </Link>
          <h1 className="mt-0.5 text-title text-ink">{title}</h1>
        </div>
        <Link
          href="/profile"
          aria-label={t("nav.profileAria")}
          className="mt-1 shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
        >
          <Avatar avatarUrl={avatarUrl} initial={initial} size={34} />
        </Link>
      </div>

      {/* Desktop — barre de contenu (titre + langue + avatar) */}
      <div className="hidden h-15 shrink-0 items-center gap-4 border-b border-line bg-card px-6 lg:flex print:hidden">
        <h1 className="text-xl font-extrabold tracking-tight text-ink">{title}</h1>
        <div className="ml-auto flex items-center gap-4">
          <LanguageSwitcher />
          <Link
            href="/profile"
            aria-label={t("nav.profileAria")}
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2"
          >
            <Avatar avatarUrl={avatarUrl} initial={initial} size={32} />
          </Link>
        </div>
      </div>
    </>
  );
}
