"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getCoffreMaster } from "@/lib/crypto/coffre-session";
import { fromBase64, openDocument } from "@/lib/crypto/vault-crypto";

/**
 * Viewer d'un document chiffré E2EE (PHIL-T01, Phase 1). Le serveur n'a servi que
 * le CHIFFRÉ : on déverrouille la maîtresse (Face ID), on déchiffre EN MÉMOIRE,
 * puis on affiche via une object URL. Le clair ne quitte jamais l'onglet.
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
  const [loading, setLoading] = useState(false);

  const decrypt = async () => {
    setError(null);
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
      const blob = new Blob([plain as BlobPart], { type: mimeType });
      setUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de déchiffrement");
    } finally {
      setLoading(false);
    }
  };

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
      <p className="text-sm text-encre-douce">
        Document chiffré de bout en bout. Déverrouille-le avec Face ID / empreinte pour l'afficher.
      </p>
      <Button type="button" onClick={decrypt} disabled={loading}>
        {loading ? "Déchiffrement…" : "Déchiffrer et afficher"}
      </Button>
      {error ? <p className="text-sm text-bordeaux">{error}</p> : null}
    </div>
  );
}
