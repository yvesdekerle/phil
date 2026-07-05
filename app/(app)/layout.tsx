import Link from "next/link";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { getT } from "@/lib/i18n/server";
import { getOwnProfile } from "@/lib/supabase/profiles";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const profile = await getOwnProfile(supabase);
  const t = await getT();
  const initial = (profile?.display_name ?? "?").charAt(0).toUpperCase();

  const navLinks = [
    { href: "/trips", label: t("nav.trips") },
    { href: "/vault", label: t("nav.vault") },
    { href: "/friends", label: t("nav.friends") },
    { href: "/horloges", label: t("nav.clocks") },
    { href: "/conseils", label: t("nav.tips") },
  ];

  return (
    <>
      <header className="border-b border-laiton-clair/60">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link
              href="/trips"
              className="font-display text-2xl text-encre focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laiton"
            >
              Phil
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-encre-douce transition-colors hover:text-encre focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laiton"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <ProfileMenu avatarUrl={profile?.avatar_url ?? null} initial={initial} />
        </div>
      </header>
      {children}
    </>
  );
}
