import { format, parseISO } from "date-fns";
import { notFound, redirect } from "next/navigation";
import { CategoryIcon } from "@/components/vault/category-icon";
import { EncryptedDocumentNumber } from "@/components/vault/encrypted-document-number";
import { OfflineVaultToggle } from "@/components/vault/offline-vault-toggle";
import { getDateFnsLocale, getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel } from "@/lib/vault/categories";
import { DocumentActions } from "./document-actions";
import { EncryptedDocumentViewer } from "./encrypted-viewer";
import { ShareManager } from "./share-manager";

export default async function VaultDocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const t = await getT();
  const dfLocale = await getDateFnsLocale();
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
        "id, trip_id, shared_with, expires_at, wrapped_dek, dek_iv, enc_file_iv, storage_path, trips(name, end_date), profiles!document_shares_shared_with_fkey(display_name)",
      )
      .eq("document_id", documentId),
  ]);

  if (!doc) {
    notFound();
  }

  const shares = (shareRows ?? []).map((s) => ({
    shareId: s.id,
    tripId: s.trip_id,
    tripName: s.trips?.name ?? t("documents.share.tripFallback"),
    recipientName: s.shared_with
      ? (s.profiles?.display_name ?? t("documents.share.travelerFallback"))
      : null,
    expiresAt: s.expires_at,
    tripEndDate: s.trips?.end_date ?? null,
  }));

  const viewUrl = `/api/documents/${doc.id}/view`;
  const isImage = doc.mime_type.startsWith("image/");
  const isPdf = doc.mime_type === "application/pdf";
  const metadata = (doc.metadata ?? {}) as Record<string, string>;

  // PHIL-T01 : le lecteur est le propriétaire, ou un destinataire d'un partage
  // E2EE — il lit alors le BLOB DÉDIÉ (déjà filigrané) via sa propre clé.
  const isOwner = doc.owner_id === user.id;
  let recipient: { sourceUrl: string; wrappedDek: string; dekIv: string; fileIv: string } | null =
    null;
  let ownerPublicKeyJwk: JsonWebKey | null = null;
  if (doc.encrypted && !isOwner) {
    const myShare = (shareRows ?? []).find(
      (s) => s.shared_with === user.id && s.wrapped_dek && s.storage_path,
    );
    if (myShare?.wrapped_dek && myShare.dek_iv && myShare.enc_file_iv) {
      const { data: ownerKey } = await supabase
        .from("user_crypto_keys")
        .select("public_key")
        .eq("user_id", doc.owner_id)
        .maybeSingle();
      if (ownerKey) {
        recipient = {
          sourceUrl: `/api/document-shares/${myShare.id}/view`,
          wrappedDek: myShare.wrapped_dek,
          dekIv: myShare.dek_iv,
          fileIv: myShare.enc_file_iv,
        };
        ownerPublicKeyJwk = ownerKey.public_key as JsonWebKey;
      }
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-start gap-4">
        <CategoryIcon category={doc.category} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl text-encre">{doc.file_name}</h1>
          <p className="mt-1 text-sm text-encre-douce">
            {doc.label ?? categoryLabel(t, doc.category)} · {t("vault.addedOn")}{" "}
            {format(parseISO(doc.uploaded_at), "d MMMM yyyy", { locale: dfLocale })} ·{" "}
            {(doc.size_bytes / 1024 / 1024).toFixed(1)} {t("vault.detail.sizeUnit")}
          </p>
          <p className="mt-0.5 text-xs text-encre-douce">
            {doc.expires_at
              ? `${t("vault.detail.expiresOnPrefix")} ${format(parseISO(doc.expires_at), "d MMMM yyyy", { locale: dfLocale })}`
              : t("vault.detail.noExpiry")}
            {/* PHIL-R10 : n° chiffré → déchiffré côté client (propriétaire) ; legacy clair en repli. */}
            {isOwner && metadata.enc_document_number && metadata.enc_document_number_iv ? (
              <EncryptedDocumentNumber
                prefix={t("vault.detail.numberPrefix")}
                encValue={metadata.enc_document_number}
                iv={metadata.enc_document_number_iv}
              />
            ) : metadata.document_number ? (
              ` · ${t("vault.detail.numberPrefix")} ${metadata.document_number}`
            ) : null}
          </p>
        </div>
      </div>

      {/* Partage et actions : réservés au propriétaire. Un destinataire ne voit
          que le document (le partage/suppression sont de toute façon bloqués par RLS). */}
      {isOwner ? (
        <div className="mb-6 flex flex-col gap-4">
          <ShareManager
            documentId={doc.id}
            shares={shares}
            encrypted={doc.encrypted}
            encWrappedDek={doc.enc_wrapped_dek ?? ""}
            encDekIv={doc.enc_dek_iv ?? ""}
            encFileIv={doc.enc_file_iv ?? ""}
            mimeType={doc.mime_type}
            ownerId={user.id}
          />
          <DocumentActions
            documentId={doc.id}
            fileName={doc.file_name}
            category={doc.category}
            expiresAt={doc.expires_at ?? ""}
            encrypted={doc.encrypted}
            encDocumentNumber={metadata.enc_document_number ?? ""}
            encDocumentNumberIv={metadata.enc_document_number_iv ?? ""}
            documentNumber={metadata.document_number ?? ""}
          />
          <OfflineVaultToggle documentId={doc.id} />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-laiton-clair bg-papier">
        {doc.encrypted ? (
          <EncryptedDocumentViewer
            sourceUrl={recipient ? recipient.sourceUrl : `/api/documents/${doc.id}/view`}
            mimeType={recipient ? "application/pdf" : doc.mime_type}
            fileName={doc.file_name}
            fileIv={recipient ? recipient.fileIv : (doc.enc_file_iv ?? "")}
            wrappedDek={recipient ? recipient.wrappedDek : (doc.enc_wrapped_dek ?? "")}
            dekIv={recipient ? recipient.dekIv : (doc.enc_dek_iv ?? "")}
            mode={recipient ? "recipient" : "owner"}
            ownerPublicKeyJwk={ownerPublicKeyJwk}
          />
        ) : isPdf ? (
          <iframe src={viewUrl} title={doc.file_name} className="h-[70vh] w-full" />
        ) : isImage ? (
          // biome-ignore lint/performance/noImgElement: flux authentifié via l'API, next/image ne peut pas optimiser ce endpoint privé
          <img src={viewUrl} alt={doc.file_name} className="mx-auto max-h-[70vh] w-auto" />
        ) : (
          <div className="px-6 py-12 text-center text-sm text-encre-douce">
            {t("vault.detail.previewUnavailable")}{" "}
            <a href={viewUrl} className="text-bordeaux underline underline-offset-4">
              {t("vault.detail.openFile")}
            </a>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-encre-douce">{t("vault.detail.auditNote")}</p>
    </main>
  );
}
