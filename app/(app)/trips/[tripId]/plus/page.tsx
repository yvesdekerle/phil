import {
  BarChart3,
  BedDouble,
  BookOpen,
  FileText,
  Images,
  LifeBuoy,
  Lightbulb,
  Luggage,
  Settings,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

/**
 * Grille « Plus » (prototype : Plus → Idées → vote) — tout ce qui n'est pas
 * dans la barre d'onglets mobile (Programme · Carte · Bourse · Plus), Idées
 * en tête. Sur desktop, la sidebar liste déjà ces entrées à plat ; cette page
 * reste accessible mais sert surtout le mobile.
 */
const ITEMS = [
  { segment: "ideas", key: "ideas", Icon: Lightbulb },
  { segment: "polls", key: "polls", Icon: BarChart3 },
  { segment: "lodging", key: "lodging", Icon: BedDouble },
  { segment: "miam", key: "miam", Icon: UtensilsCrossed },
  { segment: "checklist", key: "checklist", Icon: Luggage },
  { segment: "photos", key: "photos", Icon: Images },
  { segment: "documents", key: "documents", Icon: FileText },
  { segment: "guide", key: "guide", Icon: BookOpen },
  { segment: "participants", key: "participants", Icon: Users },
  { segment: "emergency", key: "emergency", Icon: LifeBuoy },
  { segment: "settings", key: "settings", Icon: Settings },
] as const;

export default async function TripPlusPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const t = await getT();

  return (
    <section aria-label={t("tripTabs.plus")}>
      <h1 className="sr-only">{t("tripTabs.plus")}</h1>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {ITEMS.map(({ segment, key, Icon }) => (
          <Link
            key={key}
            href={`/trips/${tripId}/${segment}`}
            className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-line bg-card px-2 py-4 text-center transition-all outline-none hover:-translate-y-px hover:shadow-float focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand active:scale-[.98]"
          >
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-full bg-wash text-ink"
            >
              <Icon className="size-5" />
            </span>
            <span className="text-ui text-ink">{t(`tripTabs.${key}`)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
