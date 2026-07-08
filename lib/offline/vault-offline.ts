import { offlineDb } from "./db";
import { OFFLINE_STORAGE_LIMIT_BYTES, offlineStorageUsed } from "./documents";
import { cacheMasterWraps } from "./vault-crypto-cache";
import { getVaultOfflineMeta } from "./vault-offline-actions";

/**
 * Disponibilité offline des documents du coffre chiffré (PHIL-T01 Phase 4b).
 * On range le CHIFFRÉ + la DEK emballée + les métadonnées d'affichage, et on
 * met en cache les enveloppes maîtresse pour déverrouiller sans réseau.
 */

export async function isVaultDocOffline(documentId: string): Promise<boolean> {
  return (await offlineDb.vault_docs_meta.get(documentId)) !== undefined;
}

export async function saveVaultDocOffline(
  documentId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const meta = await getVaultOfflineMeta(documentId);
  if (!meta) {
    return { ok: false, message: "Document indisponible pour l'offline." };
  }
  const response = await fetch(`/api/documents/${documentId}/view`);
  if (!response.ok) {
    return { ok: false, message: "Téléchargement impossible." };
  }
  const blob = await response.blob();

  const used = await offlineStorageUsed();
  if (used + blob.size > OFFLINE_STORAGE_LIMIT_BYTES) {
    return {
      ok: false,
      message: "Limite de 100 Mo atteinte — libère des documents offline d'abord.",
    };
  }

  await offlineDb.document_blobs.put({
    id: documentId,
    file_name: meta.fileName,
    // Chiffré : le vrai type est dans la métadonnée (le /view sert de l'octet-stream) ;
    // non chiffré : le type du blob servi fait foi.
    mime_type: meta.encrypted ? meta.mimeType : blob.type || meta.mimeType,
    size_bytes: blob.size,
    blob,
    savedAt: new Date().toISOString(),
    encrypted: meta.encrypted,
    wrapped_dek: meta.wrappedDek,
    dek_iv: meta.dekIv,
    file_iv: meta.fileIv,
  });
  await offlineDb.vault_docs_meta.put({
    id: documentId,
    file_name: meta.fileName,
    category: meta.category,
    mime_type: meta.mimeType,
    uploaded_at: meta.uploadedAt,
  });
  if (meta.encrypted) {
    await cacheMasterWraps();
  }
  return { ok: true };
}

export async function removeVaultDocOffline(documentId: string): Promise<void> {
  await offlineDb.document_blobs.delete(documentId);
  await offlineDb.vault_docs_meta.delete(documentId);
}
