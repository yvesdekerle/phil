"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n/provider";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ProfileMenu } from "@/components/layout/profile-menu";

/**
 * Header d'app canonique (déclinaison N2) — wordmark Phil (clic → Mes
 * voyages, plus de lien « retour ») + à droite : Coffre (desktop), langue,
 * avatar. La cloche de notifications s'insérera entre Coffre et l'avatar
 * (PHIL-V04). À l'intérieur d'un voyage, ce header s'efface : la sidebar
 * sombre (desktop) et le header compact du voyage (mobile) prennent le relais.
 */
export function AppHeader({ avatarUrl, initial }: { avatarUrl: string | null; initial: string }) {
  const pathname = usePathname();
  const t = useT();

  // /trips et /trips/new restent des écrans transverses.
  const inTrip = /^\/trips\/(?!new$|new\/)[^/]+/.test(pathname);
  if (inTrip) {
    return null;
  }

  return (
    <header className="border-b border-line print:hidden">
      <div className="mx-auto flex h-14 w-full max-w-content items-center justify-between px-4 lg:px-6">
        <Link
          href="/trips"
          className="rounded-sm text-xl font-extrabold tracking-tight text-ink outline-none focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
        >
          Phil
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/vault"
            className="hidden items-center gap-1.5 rounded-sm text-ui text-ink transition-colors outline-none hover:text-lagoon-ink focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand md:inline-flex"
          >
            <Lock className="size-3.5" aria-hidden="true" />
            {t("nav.vault")}
          </Link>
          <LanguageSwitcher />
          <ProfileMenu avatarUrl={avatarUrl} initial={initial} />
        </div>
      </div>
    </header>
  );
}
