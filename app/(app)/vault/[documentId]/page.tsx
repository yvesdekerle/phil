import { format, parseISO } from "date-fns";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CategoryIcon } from "@/components/vault/category-icon";
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
        "id, trip_id, shared_with, expires_at, wrapped_dek, dek_iv, trips(name, end_date), profiles!document_shares_shared_with_fkey(display_name)",
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

  // Identité du lecteur pour le filigrane client des documents chiffrés.
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  const viewerLabel = `${viewerProfile?.display_name ?? user.email ?? "Voyageur"} · ${user.id.slice(0, 8)}`;

  // PHIL-T01 Phase 3 : le lecteur est le propriétaire, ou un destinataire d'un
  // partage E2EE (DEK ré-emballée pour lui + clé publique du propriétaire).
  const isOwner = doc.owner_id === user.id;
  let recipientDek: { wrappedDek: string; dekIv: string } | null = null;
  let ownerPublicKeyJwk: JsonWebKey | null = null;
  if (doc.encrypted && !isOwner) {
    const myShare = (shareRows ?? []).find((s) => s.shared_with === user.id && s.wrapped_dek);
    if (myShare?.wrapped_dek && myShare.dek_iv) {
      const { data: ownerKey } = await supabase
        .from("user_crypto_keys")
        .select("public_key")
        .eq("user_id", doc.owner_id)
        .maybeSingle();
      if (ownerKey) {
        recipientDek = { wrappedDek: myShare.wrapped_dek, dekIv: myShare.dek_iv };
        ownerPublicKeyJwk = ownerKey.public_key as JsonWebKey;
      }
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link
        href="/vault"
        className="text-sm text-encre-douce underline underline-offset-4 hover:text-encre"
      >
        {t("vault.backLink")}
      </Link>

      <div className="mt-4 mb-6 flex items-start gap-4">
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
            {metadata.document_number
              ? ` · ${t("vault.detail.numberPrefix")} ${metadata.document_number}`
              : ""}
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4">
        {/* PHIL-Q41 : pas de mise en cache offline des documents du coffre —
            les stocker en clair sur l'appareil contournerait passkey, filigrane
            et audit. La lecture offline reste possible pour les documents de voyage. */}
        <ShareManager
          documentId={doc.id}
          shares={shares}
          encrypted={doc.encrypted}
          encWrappedDek={doc.enc_wrapped_dek ?? ""}
          encDekIv={doc.enc_dek_iv ?? ""}
        />
        <DocumentActions
          documentId={doc.id}
          fileName={doc.file_name}
          category={doc.category}
          expiresAt={doc.expires_at ?? ""}
          documentNumber={metadata.document_number ?? ""}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-laiton-clair bg-papier">
        {doc.encrypted ? (
          <EncryptedDocumentViewer
            docId={doc.id}
            mimeType={doc.mime_type}
            fileName={doc.file_name}
            fileIv={doc.enc_file_iv ?? ""}
            wrappedDek={recipientDek ? recipientDek.wrappedDek : (doc.enc_wrapped_dek ?? "")}
            dekIv={recipientDek ? recipientDek.dekIv : (doc.enc_dek_iv ?? "")}
            viewerLabel={viewerLabel}
            mode={recipientDek ? "recipient" : "owner"}
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
