import { addDays, format, parseISO } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/vault/category-icon";
import { getDateFnsLocale, getT } from "@/lib/i18n/server";
import { logger } from "@/lib/observability/logger";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import {
  categoryLabel,
  isDocumentCategory,
  VAULT_CATEGORIES,
  type VaultDocument,
} from "@/lib/vault/categories";

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const activeCategory = category && isDocumentCategory(category) ? category : null;
  const t = await getT();
  const dfLocale = await getDateFnsLocale();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  let query = supabase
    .from("documents")
    .select("*")
    .eq("scope", "VAULT")
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });
  if (activeCategory) {
    query = query.eq("category", activeCategory);
  }
  const { data, error } = await query;
  if (error) {
    // Ne pas masquer une panne DB en « coffre vide » (audit D16/R16).
    logger.error("vault_documents_query_failed", { userId: user.id, code: error.code });
    throw new Error("vault_documents_query_failed");
  }
  const documents = (data ?? []) as VaultDocument[];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl text-encre">{t("vault.title")}</h1>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/vault/activity">{t("vault.activityLink")}</Link>
          </Button>
          <Button asChild>
            <Link href="/vault/new">{t("vault.add")}</Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/vault"
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            activeCategory === null
              ? "border-bordeaux bg-bordeaux text-papier"
              : "border-laiton-clair bg-papier text-encre-douce hover:text-encre",
          )}
        >
          {t("vault.filterAll")}
        </Link>
        {VAULT_CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/vault?category=${c}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              activeCategory === c
                ? "border-bordeaux bg-bordeaux text-papier"
                : "border-laiton-clair bg-papier text-encre-douce hover:text-encre",
            )}
          >
            {categoryLabel(t, c)}
          </Link>
        ))}
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-6 py-16 text-center">
          <p className="font-display text-2xl text-encre italic">
            {activeCategory ? t("vault.emptyCategoryTitle") : t("vault.emptyTitle")}
          </p>
          <p className="max-w-sm text-sm text-encre-douce">{t("vault.emptyBody")}</p>
          <Button asChild className="mt-2">
            <Link href="/vault/new">{t("vault.add")}</Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/vault/${doc.id}`}
                className="flex items-center gap-4 rounded-lg border border-laiton-clair bg-papier px-4 py-3 transition-shadow hover:shadow-[0_2px_12px_rgba(31,42,68,0.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laiton"
              >
                <CategoryIcon category={doc.category} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-encre">
                    {doc.file_name}
                  </span>
                  <span className="block text-xs text-encre-douce">
                    {doc.label ?? categoryLabel(t, doc.category)} · {t("vault.addedOn")}{" "}
                    {format(parseISO(doc.uploaded_at), "d MMM yyyy", { locale: dfLocale })}
                  </span>
                </span>
                {doc.expires_at ? (
                  parseISO(doc.expires_at) < new Date() ? (
                    <span className="shrink-0 rounded-full bg-bordeaux/10 px-2.5 py-0.5 text-xs font-medium text-bordeaux">
                      {t("vault.expired")}
                    </span>
                  ) : parseISO(doc.expires_at) < addDays(new Date(), 90) ? (
                    <span className="shrink-0 rounded-full bg-laiton/20 px-2.5 py-0.5 text-xs font-medium text-laiton">
                      {t("vault.expiresSoon")}{" "}
                      {format(parseISO(doc.expires_at), "d MMM yyyy", { locale: dfLocale })}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-encre-douce">
                      {t("vault.expiresOnPrefix")}{" "}
                      {format(parseISO(doc.expires_at), "d MMM yyyy", { locale: dfLocale })}
                    </span>
                  )
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
