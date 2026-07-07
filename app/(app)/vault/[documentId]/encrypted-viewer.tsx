"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getCoffreMaster, isCoffreUnlocked } from "@/lib/crypto/coffre-session";
import { fromBase64, openDocument } from "@/lib/crypto/vault-crypto";
import { canWatermark, watermarkImage, watermarkPdf } from "@/lib/vault/watermark";

/**
 * Viewer d'un document chiffré E2EE (PHIL-T01). Le serveur n'a servi que le
 * CHIFFRÉ : on déchiffre EN MÉMOIRE, on appose le filigrane côté client
 * (Phase 2, « Phil · vu par… », baked-in), puis on affiche via object URL. Le
 * clair ne quitte jamais l'onglet.
 *
 * Session déjà déverrouillée → affichage direct ; sinon biométrie.
 */
export function EncryptedDocumentViewer({
  docId,
  mimeType,
  fileName,
  fileIv,
  wrappedDek,
  dekIv,
  viewerLabel,
}: {
  docId: string;
  mimeType: string;
  fileName: string;
  fileIv: string;
  wrappedDek: string;
  dekIv: string;
  /** Identité du lecteur pour le filigrane : « Prénom Nom · id ». */
  viewerLabel: string;
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
      const master = await getCoffreMaster();
      const res = await fetch(`/api/documents/${docId}/view`);
      if (!res.ok) {
        throw new Error("Fichier indisponible");
      }
      const ciphertext = new Uint8Array(await res.arrayBuffer());
      const plain = await openDocument(master, {
        ciphertext,
        iv: fromBase64(fileIv),
        wrappedDek: fromBase64(wrappedDek),
        dekIv: fromBase64(dekIv),
      });

      // Filigrane côté client (Phase 2) : traçabilité des captures. Comme côté
      // serveur, images et PDF ressortent en PDF filigrané ; HEIC non filigranable.
      let bytes = plain;
      let outMime = mimeType;
      if (canWatermark(mimeType)) {
        bytes =
          mimeType === "application/pdf"
            ? await watermarkPdf(plain, viewerLabel)
            : await watermarkImage(plain, mimeType, viewerLabel);
        outMime = "application/pdf";
      }
      setResultMime(outMime);
      setUrl(URL.createObjectURL(new Blob([bytes as BlobPart], { type: outMime })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de déchiffrement");
      setNeedsUnlock(true);
    } finally {
      setLoading(false);
    }
  }, [docId, mimeType, fileIv, wrappedDek, dekIv, viewerLabel]);

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
