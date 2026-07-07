import { format, parseISO } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OfflineDocToggle } from "@/components/offline/offline-doc-toggle";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-select";
import { CategoryIcon } from "@/components/vault/category-icon";
import { getDateFnsLocale, getT } from "@/lib/i18n/server";
import { logger } from "@/lib/observability/logger";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { CATEGORIES, CATEGORY_LABELS, isDocumentCategory } from "@/lib/vault/categories";
import { DeleteDocButton } from "./delete-doc-button";

type TripDocument = {
  id: string;
  file_name: string;
  category: (typeof CATEGORIES)[number];
  label: string | null;
  uploaded_at: string;
  scope: "VAULT" | "TRIP";
  encrypted: boolean;
  ownerName: string;
  canDelete: boolean;
  forMeOnly?: boolean;
};

export default async function TripDocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ category?: string; owner?: string }>;
}) {
  const { tripId } = await params;
  const { category, owner } = await searchParams;
  const activeCategory = category && isDocumentCategory(category) ? category : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const t = await getT();
  const dfLocale = await getDateFnsLocale();

  const [
    { data: tripDocs, error: docsError },
    { data: sharedRows, error: sharesError },
    { data: me },
  ] = await Promise.all([
    supabase
      .from("documents")
      .select(
        "id, file_name, category, label, uploaded_at, scope, owner_id, profiles(display_name)",
      )
      .eq("trip_id", tripId)
      .eq("scope", "TRIP")
      .is("deleted_at", null),
    supabase
      .from("document_shares")
      .select(
        "shared_with, documents(id, file_name, category, label, uploaded_at, scope, encrypted, deleted_at, profiles(display_name))",
      )
      .eq("trip_id", tripId),
    supabase
      .from("trip_participants")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single(),
  ]);
  if (docsError || sharesError) {
    // Ne pas masquer une panne DB en « aucun document » (audit D16/R16).
    logger.error("trip_documents_query_failed", {
      tripId,
      code: (docsError ?? sharesError)?.code,
    });
    throw new Error("trip_documents_query_failed");
  }

  const canUpload = me?.role === "OWNER" || me?.role === "EDITOR";

  const isTripOwner = me?.role === "OWNER";
  const fromTrip: TripDocument[] = (tripDocs ?? []).map((d) => ({
    id: d.id,
    file_name: d.file_name,
    category: d.category,
    label: d.label,
    uploaded_at: d.uploaded_at,
    scope: "TRIP" as const,
    encrypted: false,
    ownerName: d.profiles?.display_name ?? t("tripDocs.travelerFallback"),
    canDelete: isTripOwner || d.owner_id === user.id,
  }));

  const fromVault: TripDocument[] = (sharedRows ?? [])
    .filter(
      (r): r is typeof r & { documents: NonNullable<(typeof r)["documents"]> } =>
        r.documents !== null && r.documents.deleted_at === null,
    )
    .map((r) => ({
      id: r.documents.id,
      file_name: r.documents.file_name,
      category: r.documents.category,
      label: r.documents.label,
      uploaded_at: r.documents.uploaded_at,
      scope: "VAULT" as const,
      encrypted: r.documents.encrypted,
      ownerName: r.documents.profiles?.display_name ?? t("tripDocs.travelerFallback"),
      canDelete: false, // un doc du coffre partagé se gère depuis le coffre
      forMeOnly: r.shared_with === user.id, // E09 : partage ciblé
    }));

  const owners = [...new Set([...fromTrip, ...fromVault].map((d) => d.ownerName))].sort();

  let documents = [...fromTrip, ...fromVault].sort((a, b) =>
    b.uploaded_at.localeCompare(a.uploaded_at),
  );
  if (activeCategory) {
    documents = documents.filter((d) => d.category === activeCategory);
  }
  if (owner) {
    documents = documents.filter((d) => d.ownerName === owner);
  }

  const filterHref = (c: string | null, o: string | null) => {
    const params = new URLSearchParams();
    if (c) params.set("category", c);
    if (o) params.set("owner", o);
    const qs = params.toString();
    return `/trips/${tripId}/documents${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-encre-douce">{t("tripDocs.subtitle")}</p>
        {canUpload ? (
          <Button asChild>
            <Link href={`/trips/${tripId}/documents/new`}>{t("tripDocs.add")}</Link>
          </Button>
        ) : null}
      </div>

      <FilterSelect
        value={activeCategory ?? ""}
        ariaLabel={t("tripDocs.categoryFilter")}
        className="sm:w-72"
        options={[
          { value: "", label: t("tripDocs.allCategories"), href: filterHref(null, owner ?? null) },
          ...CATEGORIES.map((c) => ({
            value: c,
            label: CATEGORY_LABELS[c],
            href: filterHref(c, owner ?? null),
          })),
        ]}
      />

      {owners.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href={filterHref(activeCategory, null)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              !owner
                ? "border-laiton bg-laiton text-papier"
                : "border-laiton-clair bg-papier text-encre-douce hover:text-encre",
            )}
          >
            {t("tripDocs.allTravelers")}
          </Link>
          {owners.map((o) => (
            <Link
              key={o}
              href={filterHref(activeCategory, o)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                owner === o
                  ? "border-laiton bg-laiton text-papier"
                  : "border-laiton-clair bg-papier text-encre-douce hover:text-encre",
              )}
            >
              {o}
            </Link>
          ))}
        </div>
      ) : null}

      {documents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-6 py-14 text-center">
          <p className="font-display text-xl text-encre italic">{t("tripDocs.emptyTitle")}</p>
          <p className="max-w-sm text-sm text-encre-douce">{t("tripDocs.emptyBody")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 rounded-lg border border-laiton-clair bg-papier px-4 py-3"
            >
              <a
                href={
                  doc.scope === "VAULT" && doc.encrypted
                    ? `/vault/${doc.id}`
                    : `/api/documents/${doc.id}/view`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 flex-1 items-center gap-4"
              >
                <CategoryIcon category={doc.category} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-encre">
                    {doc.file_name}
                  </span>
                  <span className="block text-xs text-encre-douce">
                    {doc.label ?? CATEGORY_LABELS[doc.category]} ·{" "}
                    {format(parseISO(doc.uploaded_at), "d MMM yyyy", { locale: dfLocale })}
                  </span>
                </span>
              </a>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  doc.scope === "VAULT"
                    ? "bg-laiton/15 text-laiton"
                    : "bg-encre-douce/10 text-encre-douce",
                )}
              >
                {doc.scope === "VAULT"
                  ? `${t("tripDocs.sharedBy")} ${doc.ownerName}${doc.forMeOnly ? ` ${t("tripDocs.forYou")}` : ""}`
                  : `${t("tripDocs.addedBy")} ${doc.ownerName}`}
              </span>
              <OfflineDocToggle documentId={doc.id} fileName={doc.file_name} />
              {doc.canDelete ? (
                <DeleteDocButton tripId={tripId} documentId={doc.id} fileName={doc.file_name} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
