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
 * Viewer d'un document chiffré E2EE (PHIL-T01). Le serveur ne sert que du CHIFFRÉ :
 * on déchiffre EN MÉMOIRE et on affiche le fichier tel quel (le clair ne quitte
 * jamais l'onglet).
 *
 * Deux modes :
 *  - propriétaire : `sourceUrl` = le blob du document, DEK déballée avec la maîtresse ;
 *  - destinataire : `sourceUrl` = le blob DÉDIÉ du partage (déjà filigrané à son
 *    identité), DEK déballée via ECDH (sa privée + la publique du propriétaire).
 * Aucun filigrane côté client : pour un destinataire il est déjà incrusté au partage.
 */
export function EncryptedDocumentViewer({
  sourceUrl,
  mimeType,
  fileName,
  fileIv,
  wrappedDek,
  dekIv,
  mode,
  ownerPublicKeyJwk,
}: {
  sourceUrl: string;
  mimeType: string;
  fileName: string;
  fileIv: string;
  wrappedDek: string;
  dekIv: string;
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
      const res = await fetch(sourceUrl);
      if (!res.ok) {
        throw new Error("Fichier indisponible");
      }
      const ciphertext = new Uint8Array(await res.arrayBuffer());

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
  }, [sourceUrl, mimeType, fileIv, wrappedDek, dekIv, mode, ownerPublicKeyJwk]);

  // Session déjà déverrouillée → affichage direct. Garde-fou : une seule tentative
  // auto (évite le double-rendu React en dev).
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
