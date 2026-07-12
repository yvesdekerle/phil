import { AppHeader } from "@/components/layout/app-header";
import { AppTabBar } from "@/components/layout/app-tab-bar";
import { getOwnProfile } from "@/lib/supabase/profiles";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const profile = await getOwnProfile(supabase);
  const initial = (profile?.display_name ?? "?").charAt(0).toUpperCase();

  return (
    <>
      <AppHeader avatarUrl={profile?.avatar_url ?? null} initial={initial} />
      {children}
      <AppTabBar />
    </>
  );
}
