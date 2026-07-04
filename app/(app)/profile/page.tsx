import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { parsePreferences } from "@/lib/notifications/preferences";
import { getOwnProfile } from "@/lib/supabase/profiles";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { DeleteAccountSection } from "./delete-account";
import { NotificationPreferencesForm } from "./notification-preferences";
import { ProfileForm } from "./profile-form";
import { PushToggle } from "./push-toggle";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getOwnProfile(supabase);
  const displayName = profile?.display_name ?? "";
  const avatarUrl = profile?.avatar_url ?? undefined;

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-12">
      <div className="w-full max-w-lg">
        <h1 className="mb-2 text-center font-display text-3xl text-encre">Ton profil</h1>
        <p className="mb-6 text-center text-sm">
          <Link
            href="/explorer"
            className="text-encre-douce underline underline-offset-4 hover:text-encre"
          >
            Carnet de l'explorateur →
          </Link>
        </p>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                width={56}
                height={56}
                className="rounded-full border border-laiton-clair"
              />
            ) : (
              <span className="flex size-14 items-center justify-center rounded-full border border-laiton-clair bg-parchemin font-display text-xl text-laiton">
                {(displayName || user.email || "?").charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <p className="font-medium text-encre">{displayName || "Voyageur anonyme"}</p>
              <p className="text-sm text-encre-douce">{user.email}</p>
              <p className="mt-0.5 text-xs text-encre-douce">
                Email lié à ton compte Google — non modifiable ici.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <ProfileForm
              defaultValues={{
                displayName,
                locale: profile?.locale === "en" ? "en" : "fr",
                timezone: profile?.timezone ?? "Europe/Paris",
                whatsapp: profile?.whatsapp ?? "",
              }}
            />
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <p className="text-sm font-medium text-encre">Notifications par email</p>
          </CardHeader>
          <CardContent>
            <NotificationPreferencesForm
              initial={parsePreferences(profile?.notification_preferences)}
            />
            <div className="mt-4 border-t border-laiton-clair/50 pt-4">
              <PushToggle />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-center gap-4">
          <Button asChild variant="outline">
            <Link href="/security">Sécurité du coffre</Link>
          </Button>
          <Button asChild variant="outline">
            <a href="/api/export" download>
              Exporter mes données
            </a>
          </Button>
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Se déconnecter
            </Button>
          </form>
        </div>

        <DeleteAccountSection />
      </div>
    </main>
  );
}
