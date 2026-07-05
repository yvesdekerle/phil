import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CategoryIcon } from "@/components/vault/category-icon";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABELS } from "@/lib/vault/categories";
import { DocumentActions } from "./document-actions";
import { ShareManager } from "./share-manager";

export default async function VaultDocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: doc }, { data: shareRows }] = await Promise.all([
    supabase.from("documents").select("*").eq("id", documentId).is("deleted_at", null).single(),
    supabase
      .from("document_shares")
      .select(
        "id, trip_id, shared_with, expires_at, trips(name, end_date), profiles!document_shares_shared_with_fkey(display_name)",
      )
      .eq("document_id", documentId),
  ]);

  if (!doc) {
    notFound();
  }

  const shares = (shareRows ?? []).map((s) => ({
    shareId: s.id,
    tripId: s.trip_id,
    tripName: s.trips?.name ?? "Voyage",
    recipientName: s.shared_with ? (s.profiles?.display_name ?? "Un voyageur") : null,
    expiresAt: s.expires_at,
    tripEndDate: s.trips?.end_date ?? null,
  }));

  const viewUrl = `/api/documents/${doc.id}/view`;
  const isImage = doc.mime_type.startsWith("image/");
  const isPdf = doc.mime_type === "application/pdf";
  const metadata = (doc.metadata ?? {}) as Record<string, string>;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link
        href="/vault"
        className="text-sm text-encre-douce underline underline-offset-4 hover:text-encre"
      >
        ← Retour au coffre
      </Link>

      <div className="mt-4 mb-6 flex items-start gap-4">
        <CategoryIcon category={doc.category} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl text-encre">{doc.file_name}</h1>
          <p className="mt-1 text-sm text-encre-douce">
            {doc.label ?? CATEGORY_LABELS[doc.category]} · ajouté le{" "}
            {format(parseISO(doc.uploaded_at), "d MMMM yyyy", { locale: fr })} ·{" "}
            {(doc.size_bytes / 1024 / 1024).toFixed(1)} Mo
          </p>
          <p className="mt-0.5 text-xs text-encre-douce">
            {doc.expires_at
              ? `Expire le ${format(parseISO(doc.expires_at), "d MMMM yyyy", { locale: fr })}`
              : "Pas de date d'expiration"}
            {metadata.document_number ? ` · N° ${metadata.document_number}` : ""}
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4">
        {/* PHIL-Q41 : pas de mise en cache offline des documents du coffre —
            les stocker en clair sur l'appareil contournerait passkey, filigrane
            et audit. La lecture offline reste possible pour les documents de voyage. */}
        <ShareManager documentId={doc.id} shares={shares} />
        <DocumentActions
          documentId={doc.id}
          fileName={doc.file_name}
          category={doc.category}
          expiresAt={doc.expires_at ?? ""}
          documentNumber={metadata.document_number ?? ""}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-laiton-clair bg-papier">
        {isPdf ? (
          <iframe src={viewUrl} title={doc.file_name} className="h-[70vh] w-full" />
        ) : isImage ? (
          // biome-ignore lint/performance/noImgElement: flux authentifié via l'API, next/image ne peut pas optimiser ce endpoint privé
          <img src={viewUrl} alt={doc.file_name} className="mx-auto max-h-[70vh] w-auto" />
        ) : (
          <div className="px-6 py-12 text-center text-sm text-encre-douce">
            Aperçu indisponible pour ce format.{" "}
            <a href={viewUrl} className="text-bordeaux underline underline-offset-4">
              Ouvrir le fichier
            </a>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-encre-douce">
        Chaque consultation de ton coffre est consignée dans le registre de bord.
      </p>
    </main>
  );
}
