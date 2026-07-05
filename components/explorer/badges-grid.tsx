import {
  Archive,
  Award,
  Briefcase,
  Camera,
  Feather,
  Footprints,
  Globe2,
  Lightbulb,
  Luggage,
  Map as MapIcon,
  ShieldCheck,
  Stamp,
  Vote,
  Watch,
  Wind,
} from "lucide-react";
import type { Badge } from "@/lib/gamification/badges";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

const ICONS = {
  Archive,
  Briefcase,
  Camera,
  Feather,
  Footprints,
  Globe2,
  Lightbulb,
  Luggage,
  Map: MapIcon,
  ShieldCheck,
  Stamp,
  Vote,
  Watch,
  Wind,
} as const;

/** Grille des badges (PHIL-P12) : débloqués en couleur, le reste en promesse. */
export async function BadgesGrid({ badges }: { badges: Badge[] }) {
  const t = await getT();
  const unlockedCount = badges.filter((b) => b.unlocked).length;
  return (
    <section className="mt-8">
      <h2 className="mb-1 font-display text-xl text-encre">
        {t("explorer.badgesTitle")}{" "}
        <span className="text-sm text-encre-douce">
          ({unlockedCount}/{badges.length})
        </span>
      </h2>
      <p className="mb-3 text-sm text-encre-douce">{t("explorer.badgesIntro")}</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {badges.map((b) => {
          const Icon = ICONS[b.icon as keyof typeof ICONS] ?? Award;
          return (
            <li
              key={b.id}
              className={cn(
                "rounded-lg border px-3 py-3",
                b.unlocked
                  ? "border-laiton bg-gradient-to-br from-papier to-parchemin"
                  : "border-laiton-clair/60 bg-papier/60 opacity-70",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border",
                    b.unlocked
                      ? "border-laiton bg-laiton/15 text-bordeaux"
                      : "border-laiton-clair text-encre-douce/60",
                  )}
                >
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block truncate text-sm font-medium",
                      b.unlocked ? "text-encre" : "text-encre-douce",
                    )}
                  >
                    {b.name}
                  </span>
                  {!b.unlocked ? (
                    <span className="block text-[0.65rem] text-encre-douce tabular-nums">
                      {b.value}/{b.target}
                    </span>
                  ) : null}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-encre-douce">{b.description}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
