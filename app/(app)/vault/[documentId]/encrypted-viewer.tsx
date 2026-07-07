"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
 * CHIFFRÉ : on déchiffre EN MÉMOIRE et on affiche le fichier BRUT via object URL
 * (le clair ne quitte jamais l'onglet).
 *
 * Deux modes :
 *  - propriétaire : la DEK est déballée avec sa clé maîtresse ;
 *  - destinataire (Phase 3) : la DEK (ré-emballée pour lui) est déballée via ECDH
 *    (sa clé privée + la clé publique du propriétaire), et le document reçoit un
 *    filigrane à SON email en surimpression (traçabilité des captures).
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
  /** Email du lecteur, pour le filigrane (mode destinataire). */
  viewerLabel: string;
  mode: "owner" | "recipient";
  /** Clé publique du propriétaire (mode destinataire), pour dériver la clé partagée. */
  ownerPublicKeyJwk: JsonWebKey | null;
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
      setUrl(URL.createObjectURL(new Blob([plain as BlobPart], { type: mimeType })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de déchiffrement");
      setNeedsUnlock(true);
    } finally {
      setLoading(false);
    }
  }, [docId, mimeType, fileIv, wrappedDek, dekIv, mode, ownerPublicKeyJwk]);

  // Session déjà déverrouillée → affichage direct (pas de biométrie redondante).
  // Garde-fou : une seule tentative auto (évite le double-rendu React en dev).
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current) {
      return;
    }
    autoStarted.current = true;
    if (isCoffreUnlocked()) {
      void decrypt();
    } else {
      setNeedsUnlock(true);
    }
  }, [decrypt]);

  if (url) {
    const isPdf = mimeType === "application/pdf";
    const isImage = mimeType.startsWith("image/");
    const content = isPdf ? (
      <iframe src={url} title={fileName} className="h-[70vh] w-full" />
    ) : isImage ? (
      // biome-ignore lint/performance/noImgElement: object URL déchiffrée en mémoire, pas un endpoint optimisable
      <img src={url} alt={fileName} className="mx-auto max-h-[70vh] w-auto" />
    ) : (
      <div className="px-6 py-12 text-center text-sm text-encre-douce">
        <a href={url} download={fileName} className="text-bordeaux underline underline-offset-4">
          Télécharger le fichier déchiffré
        </a>
      </div>
    );

    // Filigrane à l'email en surimpression : uniquement pour un destinataire.
    if (mode === "recipient") {
      const label = viewerLabel.replace(/[<>&"]/g, "");
      const svg = encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="200"><text x="8" y="120" fill="rgba(110,31,46,0.15)" font-family="sans-serif" font-size="13" transform="rotate(-30 180 110)">Phil · ${label}</text></svg>`,
      );
      return (
        <div className="relative">
          {content}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 select-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,${svg}")`,
              backgroundRepeat: "repeat",
            }}
          />
        </div>
      );
    }
    return content;
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
