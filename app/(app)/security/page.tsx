import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { PasskeyManager } from "./passkey-manager";

export default async function SecurityPage() {
  const t = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: passkeys } = await supabase
    .from("user_passkeys")
    .select("id, device_name, created_at, last_used_at")
    .order("created_at", { ascending: true });

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
      <p className="mb-6 text-center text-sm text-encre-douce">{t("security.subtitle")}</p>
      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-encre">{t("security.passkeysTitle")}</p>
        </CardHeader>
        <CardContent>
          <PasskeyManager passkeys={passkeys ?? []} />
        </CardContent>
      </Card>
    </main>
  );
}
