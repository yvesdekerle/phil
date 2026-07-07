"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getCoffreMaster,
  getCoffrePrivateKey,
  isCoffreUnlocked,
} from "@/lib/crypto/coffre-session";
import {
  decryptBytes,
  deriveSharedWrapKey,
  fromBase64,
  importEcdhPublic,
  unwrapKey,
} from "@/lib/crypto/vault-crypto";

/**
 * Viewer d'un document chiffré E2EE (PHIL-T01). Le serveur n'a servi que le
 * CHIFFRÉ : on déchiffre EN MÉMOIRE, on appose le filigrane côté client
 * (« Phil · vu par… », baked-in), puis on affiche via object URL.
 *
 * Deux modes :
 *  - propriétaire : la DEK est déballée avec sa clé maîtresse ;
 *  - destinataire (Phase 3) : la DEK (ré-emballée pour lui) est déballée via ECDH
 *    (sa clé privée + la clé publique du propriétaire).
 */
export function EncryptedDocumentViewer({
  docId,
  mimeType,
  fileName,
  fileIv,
  wrappedDek,
  dekIv,
  viewerLabel,
  mode,
  ownerPublicKeyJwk,
}: {
  docId: string;
  mimeType: string;
  fileName: string;
  fileIv: string;
  wrappedDek: string;
  dekIv: string;
  /** Identité du lecteur pour le filigrane : « Prénom Nom · id ». */
  viewerLabel: string;
  mode: "owner" | "recipient";
  /** Clé publique du propriétaire (mode destinataire), pour dériver la clé partagée. */
  ownerPublicKeyJwk: JsonWebKey | null;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [resultMime, setResultMime] = useState(mimeType);
  const [error, setError] = useState<string | null>(null);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [loading, setLoading] = useState(false);

  const decrypt = useCallback(async () => {
    setError(null);
    setNeedsUnlock(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${docId}/view`);
      if (!res.ok) {
        throw new Error("Fichier indisponible");
      }
      const ciphertext = new Uint8Array(await res.arrayBuffer());

      // Déballage de la DEK selon le mode.
      let dek: CryptoKey;
      if (mode === "recipient" && ownerPublicKeyJwk) {
        const myPriv = await getCoffrePrivateKey();
        const ownerPub = await importEcdhPublic(ownerPublicKeyJwk);
        const sharedKey = await deriveSharedWrapKey(myPriv, ownerPub);
        dek = await unwrapKey(sharedKey, fromBase64(wrappedDek), fromBase64(dekIv));
      } else {
        const master = await getCoffreMaster();
        dek = await unwrapKey(master, fromBase64(wrappedDek), fromBase64(dekIv));
      }
      const plain = await decryptBytes(dek, ciphertext, fromBase64(fileIv));

      // Filigrane : UNIQUEMENT pour un destinataire (traçabilité, à son email) ;
      // jamais sur son propre document. pdf-lib chargé à la volée.
      let bytes = plain;
      let outMime = mimeType;
      if (mode === "recipient") {
        const { canWatermark, watermarkImage, watermarkPdf } = await import(
          "@/lib/vault/watermark"
        );
        if (canWatermark(mimeType)) {
          bytes =
            mimeType === "application/pdf"
              ? await watermarkPdf(plain, viewerLabel)
              : await watermarkImage(plain, mimeType, viewerLabel);
          outMime = "application/pdf";
        }
      }
      setResultMime(outMime);
      setUrl(URL.createObjectURL(new Blob([bytes as BlobPart], { type: outMime })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de déchiffrement");
      setNeedsUnlock(true);
    } finally {
      setLoading(false);
    }
  }, [docId, mimeType, fileIv, wrappedDek, dekIv, viewerLabel, mode, ownerPublicKeyJwk]);

  // Session déjà déverrouillée → affichage direct (pas de biométrie redondante).
  useEffect(() => {
    if (isCoffreUnlocked()) {
      void decrypt();
    } else {
      setNeedsUnlock(true);
    }
  }, [decrypt]);

  if (url) {
    if (resultMime === "application/pdf") {
      return <iframe src={url} title={fileName} className="h-[70vh] w-full" />;
    }
    if (resultMime.startsWith("image/")) {
      return (
        // biome-ignore lint/performance/noImgElement: object URL déchiffrée en mémoire, pas un endpoint optimisable
        <img src={url} alt={fileName} className="mx-auto max-h-[70vh] w-auto" />
      );
    }
    return (
      <div className="px-6 py-12 text-center text-sm text-encre-douce">
        <a href={url} download={fileName} className="text-bordeaux underline underline-offset-4">
          Télécharger le fichier déchiffré
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {needsUnlock ? (
        <>
          <p className="text-sm text-encre-douce">
            Document chiffré de bout en bout. Déverrouille-le avec Face ID / empreinte pour
            l'afficher.
          </p>
          <Button type="button" onClick={() => void decrypt()} disabled={loading}>
            {loading ? "Déchiffrement…" : "Déchiffrer et afficher"}
          </Button>
        </>
      ) : (
        <p className="text-sm text-encre-douce">Ouverture du document…</p>
      )}
      {error ? <p className="text-sm text-bordeaux">{error}</p> : null}
    </div>
  );
}
