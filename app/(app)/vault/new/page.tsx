import { redirect } from "next/navigation";
import { UploadForm } from "@/components/documents/upload-form";
import { Card, CardContent } from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { VAULT_CATEGORIES } from "@/lib/vault/categories";
import { createDocument } from "./actions";

export default async function NewDocumentPage() {
  const t = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // PHIL-T01 : chiffrer les nouveaux documents du coffre si l'E2EE est activé.
  const { data: coffreKey } = await supabase
    .from("user_crypto_keys")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
      <h1 className="mb-2 text-center font-display text-3xl text-encre">{t("vault.new.title")}</h1>
      <p className="mb-2 text-center text-sm text-encre-douce">{t("vault.new.subtitle")}</p>
      <p className="mb-6 text-center text-xs text-encre-douce">
        {t("vault.new.hintBefore")} <strong>{t("vault.new.hintTripDocs")}</strong>{" "}
        {t("vault.new.hintAfter")}
      </p>
      <Card>
        <CardContent>
          <UploadForm
            userId={user.id}
            action={createDocument}
            categories={VAULT_CATEGORIES}
            submitLabel={t("vault.new.submit")}
            pendingLabel={t("vault.new.pending")}
            encrypt={Boolean(coffreKey)}
          />
        </CardContent>
      </Card>
    </main>
  );
}
