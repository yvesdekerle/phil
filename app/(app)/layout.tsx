import Link from "next/link";
import { AppTabBar } from "@/components/layout/app-tab-bar";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { getT } from "@/lib/i18n/server";
import { getOwnProfile } from "@/lib/supabase/profiles";
import { createClient } from "@/lib/supabase/server";

/**
 * Header d'app « Lagune vive » (handoff §4) — wordmark Schibsted 800 + nav
 * transverse (Mes voyages · Coffre) sur desktop ; Amis / Horloges / Conseils
 * vivent dans le hub Profil (menu avatar, puis page Profil). L'emplacement à
 * droite du wordmark accueillera la cloche de notifications (PHIL-V04).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const profile = await getOwnProfile(supabase);
  const t = await getT();
  const initial = (profile?.display_name ?? "?").charAt(0).toUpperCase();

  const navLinks = [
    { href: "/trips", label: t("nav.trips") },
    { href: "/vault", label: t("nav.vault") },
  ];

  return (
    <>
      <header className="border-b border-line print:hidden">
        <div className="mx-auto flex h-14 w-full max-w-content items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-6">
            <Link
              href="/trips"
              className="rounded-sm text-xl font-extrabold tracking-tight text-ink outline-none focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
            >
              Phil
            </Link>
            <nav className="hidden items-center gap-4 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-sm text-ui text-slate transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ProfileMenu avatarUrl={profile?.avatar_url ?? null} initial={initial} />
          </div>
        </div>
      </header>
      {children}
      <AppTabBar />
    </>
  );
}
