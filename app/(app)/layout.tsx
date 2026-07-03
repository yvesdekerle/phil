import Image from "next/image";
import Link from "next/link";
import { getOwnProfile } from "@/lib/supabase/profiles";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const profile = await getOwnProfile(supabase);
  const initial = (profile?.display_name ?? "?").charAt(0).toUpperCase();

  return (
    <>
      <header className="border-b border-laiton-clair/60">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link
            href="/trips"
            className="font-display text-2xl text-encre focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laiton"
          >
            Phil
          </Link>
          <Link
            href="/profile"
            aria-label="Ton profil"
            className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laiton"
          >
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt=""
                width={34}
                height={34}
                className="rounded-full border border-laiton-clair"
              />
            ) : (
              <span className="flex size-[34px] items-center justify-center rounded-full border border-laiton-clair bg-papier text-sm text-laiton">
                {initial}
              </span>
            )}
          </Link>
        </div>
      </header>
      {children}
    </>
  );
}
