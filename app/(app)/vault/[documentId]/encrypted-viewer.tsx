"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getCoffreMaster, isCoffreUnlocked } from "@/lib/crypto/coffre-session";
import { fromBase64, openDocument } from "@/lib/crypto/vault-crypto";

/**
 * Viewer d'un document chiffré E2EE (PHIL-T01, Phase 1). Le serveur n'a servi que
 * le CHIFFRÉ : on déchiffre EN MÉMOIRE puis on affiche via une object URL. Le
 * clair ne quitte jamais l'onglet.
 *
 * Si la session est déjà déverrouillée (maîtresse en mémoire), on affiche
 * directement ; sinon on demande la biométrie (Face ID / empreinte) pour
 * autoriser le déchiffrement.
 */
export function EncryptedDocumentViewer({
  docId,
  mimeType,
  fileName,
  fileIv,
  wrappedDek,
  dekIv,
}: {
  docId: string;
  mimeType: string;
  fileName: string;
  fileIv: string;
  wrappedDek: string;
  dekIv: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
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
      setUrl(URL.createObjectURL(new Blob([plain as BlobPart], { type: mimeType })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de déchiffrement");
      setNeedsUnlock(true);
    } finally {
      setLoading(false);
    }
  }, [docId, mimeType, fileIv, wrappedDek, dekIv]);

  // Session déjà déverrouillée → affichage direct (pas de biométrie redondante).
  // Sinon → on présente le bouton qui déclenchera Face ID / empreinte.
  useEffect(() => {
    if (isCoffreUnlocked()) {
      void decrypt();
    } else {
      setNeedsUnlock(true);
    }
  }, [decrypt]);

  if (url) {
    if (mimeType === "application/pdf") {
      return <iframe src={url} title={fileName} className="h-[70vh] w-full" />;
    }
    if (mimeType.startsWith("image/")) {
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
