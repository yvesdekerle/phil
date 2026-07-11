import { addDays, format, parseISO } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CoffreActivation } from "@/app/(app)/profile/coffre-activation";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/vault/category-icon";
import { getDateFnsLocale, getT } from "@/lib/i18n/server";
import { logger } from "@/lib/observability/logger";
import { getOwnProfile } from "@/lib/supabase/profiles";
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

  // PHIL-T01 : proposer l'activation du coffre chiffré s'il ne l'est pas encore.
  const { data: coffreKey } = await supabase
    .from("user_crypto_keys")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const profile = await getOwnProfile(supabase);
  const displayName = profile?.display_name ?? "";

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

  // PHIL-T01 : documents partagés AVEC moi (par d'autres, via leur coffre).
  const { data: sharedRows } = await supabase
    .from("document_shares")
    .select(
      "id, expires_at, documents(id, file_name, category, label), profiles!document_shares_shared_by_fkey(display_name)",
    )
    .eq("shared_with", user.id);
  const now = new Date();
  const sharedWithMe = (sharedRows ?? [])
    .filter((s) => s.documents && (!s.expires_at || new Date(s.expires_at) > now))
    .map((s) => ({
      id: s.documents?.id ?? "",
      fileName: s.documents?.file_name ?? "",
      category: s.documents?.category ?? "other",
      sharedBy: s.profiles?.display_name ?? t("documents.share.travelerFallback"),
      expiresAt: s.expires_at,
    }));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-sans text-3xl text-ink">{t("vault.title")}</h1>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/vault/activity">{t("vault.activityLink")}</Link>
          </Button>
          <Button asChild>
            <Link href="/vault/new">{t("vault.add")}</Link>
          </Button>
        </div>
      </div>

      {!coffreKey ? (
        <div className="mb-6 rounded-lg border border-line bg-card px-5 py-4">
          <p className="text-sm font-medium text-ink">Sécurise ton coffre</p>
          <p className="mt-1 mb-3 text-sm text-slate">
            Active le chiffrement de bout en bout : tes documents ne seront lisibles que par toi (et
            ceux à qui tu les partages), déverrouillés par Face ID / empreinte.
          </p>
          <CoffreActivation
            userId={user.id}
            userName={displayName || user.email || "Voyageur"}
            activated={false}
          />
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/vault"
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            activeCategory === null
              ? "border-lagoon-ink bg-lagoon-ink text-card"
              : "border-line bg-card text-slate hover:text-ink",
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
                ? "border-lagoon-ink bg-lagoon-ink text-card"
                : "border-line bg-card text-slate hover:text-ink",
            )}
          >
            {categoryLabel(t, c)}
          </Link>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-medium text-ink">Mes documents</h2>
      {documents.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-line bg-card/60 px-6 py-16 text-center">
          <p className="font-sans text-2xl text-ink italic">
            {activeCategory ? t("vault.emptyCategoryTitle") : t("vault.emptyTitle")}
          </p>
          <p className="max-w-sm text-sm text-slate">{t("vault.emptyBody")}</p>
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
                className="flex items-center gap-4 rounded-lg border border-line bg-card px-4 py-3 transition-shadow hover:shadow-[0_2px_12px_rgba(15,47,56,0.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mist"
              >
                <CategoryIcon category={doc.category} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {doc.file_name}
                  </span>
                  <span className="block text-xs text-slate">
                    {doc.label ?? categoryLabel(t, doc.category)} · {t("vault.addedOn")}{" "}
                    {format(parseISO(doc.uploaded_at), "d MMM yyyy", { locale: dfLocale })}
                  </span>
                </span>
                {doc.expires_at ? (
                  parseISO(doc.expires_at) < new Date() ? (
                    <span className="shrink-0 rounded-full bg-lagoon-ink/10 px-2.5 py-0.5 text-xs font-medium text-lagoon-ink">
                      {t("vault.expired")}
                    </span>
                  ) : parseISO(doc.expires_at) < addDays(new Date(), 90) ? (
                    <span className="shrink-0 rounded-full bg-citron/20 px-2.5 py-0.5 text-xs font-medium text-mist">
                      {t("vault.expiresSoon")}{" "}
                      {format(parseISO(doc.expires_at), "d MMM yyyy", { locale: dfLocale })}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-slate">
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

      {sharedWithMe.length > 0 ? (
        <>
          <h2 className="mt-8 mb-3 text-sm font-medium text-ink">Documents partagés avec moi</h2>
          <ul className="flex flex-col gap-2">
            {sharedWithMe.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/vault/${s.id}`}
                  className="flex items-center gap-4 rounded-lg border border-line bg-card px-4 py-3 transition-shadow hover:shadow-[0_2px_12px_rgba(15,47,56,0.1)]"
                >
                  <CategoryIcon category={s.category} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {s.fileName}
                    </span>
                    <span className="block text-xs text-slate">
                      {t("documents.share.sharedBy")} {s.sharedBy}
                      {s.expiresAt
                        ? ` · valide jusqu'au ${format(parseISO(s.expiresAt), "d MMM yyyy", { locale: dfLocale })}`
                        : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </main>
  );
}
