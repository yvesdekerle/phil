"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * Barre transverse mobile (prototype) — Voyages · Coffre · Profil, même canon
 * B9 que la barre voyage (soulignement citron sous le label). Masquée à
 * l'intérieur d'un voyage (la barre du voyage prend le relais) et sur desktop.
 */
const PROFILE_ROUTES = ["/profile", "/friends", "/horloges", "/conseils", "/explorer", "/security"];

export function AppTabBar() {
  const pathname = usePathname();
  const t = useT();

  // À l'intérieur d'un voyage (/trips/<id>/…), la TripTabBar prend le relais.
  // /trips et /trips/new restent des écrans transverses.
  const inTrip = /^\/trips\/(?!new$|new\/)[^/]+/.test(pathname);
  if (inTrip) {
    return null;
  }

  const items = [
    { key: "trips", href: "/trips", label: t("nav.trips"), active: pathname.startsWith("/trips") },
    {
      key: "vault",
      href: "/vault",
      label: t("nav.vault"),
      active: pathname.startsWith("/vault") || pathname.startsWith("/coffre"),
    },
    {
      key: "profile",
      href: "/profile",
      label: t("tripTabs.profile"),
      active: PROFILE_ROUTES.some((route) => pathname.startsWith(route)),
    },
  ];

  return (
    <>
      {/* Espace réservé en flux pour que le contenu ne finisse pas sous la barre */}
      <div aria-hidden="true" className="h-14 lg:hidden print:hidden" />
      <nav
        aria-label={t("nav.trips")}
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
              <span>{item.label}</span>
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
    </>
  );
}
