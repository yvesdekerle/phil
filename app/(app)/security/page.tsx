import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { PasskeyManager } from "./passkey-manager";

/**
 * Page « Sécurité » — ancien verrou passkey/HMAC (PHIL-C05). PHIL-T01 Phase 5a :
 * neutralisée au profit du coffre chiffré (E2EE). Si l'E2EE est actif, elle
 * annonce qu'il n'y a plus rien à faire ici ; sinon, elle invite à activer le
 * coffre chiffré et se limite à lister/révoquer d'anciennes passkeys (pas de
 * nouvelle inscription).
 */
export default async function SecurityPage() {
  const t = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: coffreKey } = await supabase
    .from("user_crypto_keys")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Coffre chiffré actif → l'ancien verrou passkey est superflu : on ne charge
  // même pas les passkeys (rien à gérer ici).
  const passkeys = coffreKey
    ? []
    : ((
        await supabase
          .from("user_passkeys")
          .select("id, device_name, created_at, last_used_at")
          .order("created_at", { ascending: true })
      ).data ?? []);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
      <Link
        href="/profile"
        className="text-sm text-encre-douce underline underline-offset-4 hover:text-encre"
      >
        {t("security.back")}
      </Link>
      <h1 className="mt-3 mb-2 text-center font-display text-3xl text-encre">
        {t("security.title")}
      </h1>

      {coffreKey ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-start gap-3 pt-6">
            <p className="text-sm font-medium text-encre">{t("security.e2eeTitle")}</p>
            <p className="text-sm text-encre-douce">{t("security.e2eeBody")}</p>
            <Button asChild variant="outline">
              <Link href="/profile">{t("security.e2eeCta")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mb-6 text-center text-sm text-encre-douce">{t("security.nudge")}</p>
          <Card>
            <CardHeader>
              <p className="text-sm font-medium text-encre">{t("security.passkeysTitle")}</p>
            </CardHeader>
            <CardContent>
              <PasskeyManager passkeys={passkeys} />
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
