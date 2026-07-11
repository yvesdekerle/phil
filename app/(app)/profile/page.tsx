import { Clock3, Compass, Lightbulb, ShieldCheck, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ListRow, ListRowChevron, ListRowContent, ListRowTitle } from "@/components/ui/list-row";
import { getT } from "@/lib/i18n/server";
import { parsePreferences } from "@/lib/notifications/preferences";
import { getOwnProfile } from "@/lib/supabase/profiles";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { CoffreActivation } from "./coffre-activation";
import { CoffreAddDevice } from "./coffre-add-device";
import { CoffreRecovery } from "./coffre-recovery";
import { CoffreRestore } from "./coffre-restore";
import { DeleteAccountSection } from "./delete-account";
import { NotificationPreferencesForm } from "./notification-preferences";
import { ProfileForm } from "./profile-form";
import { PushToggle } from "./push-toggle";

export default async function ProfilePage() {
  const t = await getT();
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

  // PHIL-T01 Phase 0 : le coffre chiffré est-il déjà activé (clés présentes) ?
  const { data: coffreKey } = await supabase
    .from("user_crypto_keys")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: recoveryWrap } = await supabase
    .from("user_master_key_wraps")
    .select("id")
    .eq("user_id", user.id)
    .eq("method", "RECOVERY")
    .maybeSingle();

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-12">
      <div className="w-full max-w-lg">
        <h1 className="mb-6 text-title text-ink">{t("profile.title")}</h1>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                width={56}
                height={56}
                className="rounded-full border border-line"
              />
            ) : (
              <span className="flex size-14 items-center justify-center rounded-full border border-line bg-sand font-sans text-xl text-mist">
                {(displayName || user.email || "?").charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <p className="font-medium text-ink">{displayName || t("profile.anonymous")}</p>
              <p className="text-sm text-slate">{user.email}</p>
              <p className="mt-0.5 text-xs text-slate">{t("profile.emailLinked")}</p>
            </div>
          </CardHeader>
          <CardContent>
            <ProfileForm
              defaultValues={{
                displayName,
                locale: profile?.locale === "fr" ? "fr" : profile?.locale === "es" ? "es" : "en",
                timezone: profile?.timezone ?? "Europe/Paris",
                whatsapp: profile?.whatsapp ?? "",
              }}
            />
          </CardContent>
        </Card>

        {/* Hub Profil (handoff §4) — rangées B6 vers les rubriques transverses */}
        <Card className="mt-6">
          <CardContent className="flex flex-col divide-y divide-wash py-0 [--card-spacing:--spacing(2)]">
            {[
              { href: "/friends", label: t("nav.friends"), Icon: Users },
              { href: "/horloges", label: t("nav.clocks"), Icon: Clock3 },
              { href: "/conseils", label: t("nav.tips"), Icon: Lightbulb },
              { href: "/explorer", label: t("profileMenu.exploration"), Icon: Compass },
              { href: "/security", label: t("security.title"), Icon: ShieldCheck },
            ].map(({ href, label, Icon }) => (
              <ListRow key={href} asChild interactive>
                <Link href={href}>
                  <Icon className="size-4 shrink-0 text-slate" aria-hidden="true" />
                  <ListRowContent>
                    <ListRowTitle>{label}</ListRowTitle>
                  </ListRowContent>
                  <ListRowChevron />
                </Link>
              </ListRow>
            ))}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <p className="text-sm font-medium text-ink">{t("profile.emailNotifs")}</p>
          </CardHeader>
          <CardContent>
            <NotificationPreferencesForm
              initial={parsePreferences(profile?.notification_preferences)}
            />
            <div className="mt-4 border-t border-line/50 pt-4">
              <PushToggle />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <p className="text-sm font-medium text-ink">Coffre chiffré</p>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-slate">
              Chiffre tes documents d'identité de bout en bout : le serveur ne peut jamais les lire.
              Déverrouillage par Face ID / empreinte sur cet appareil.
            </p>
            <CoffreActivation
              userId={user.id}
              userName={displayName || user.email || "Voyageur"}
              activated={Boolean(coffreKey)}
            />
            {coffreKey ? (
              <div className="mt-4 border-t border-line/50 pt-4">
                <CoffreRecovery hasRecovery={Boolean(recoveryWrap)} />
              </div>
            ) : null}
            {coffreKey && recoveryWrap ? (
              <div className="mt-4 border-t border-line/50 pt-4">
                <CoffreRestore
                  userId={user.id}
                  userName={displayName || user.email || "Voyageur"}
                />
              </div>
            ) : null}
            {coffreKey ? (
              <div className="mt-4 border-t border-line/50 pt-4">
                <CoffreAddDevice
                  userId={user.id}
                  userName={displayName || user.email || "Voyageur"}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-center gap-4">
          {/* PHIL-T01 Phase 5a : le lien passkey/HMAC est masqué dès que le coffre
              chiffré (E2EE) est actif — il n'apporte plus rien. */}
          {coffreKey ? null : (
            <Button asChild variant="outline">
              <Link href="/security">{t("profile.vaultSecurity")}</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <a href="/api/export" download>
              {t("profile.exportData")}
            </a>
          </Button>
          <form action={signOut}>
            <Button type="submit" variant="outline">
              {t("profile.signOut")}
            </Button>
          </form>
        </div>

        <DeleteAccountSection />
      </div>
    </main>
  );
}
