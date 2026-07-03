import { offlineDb } from "./db";

/** Limite de stockage offline des fichiers (PHIL-I04). */
export const OFFLINE_STORAGE_LIMIT_BYTES = 100 * 1024 * 1024; // 100 Mo

export async function offlineStorageUsed(): Promise<number> {
  const blobs = await offlineDb.document_blobs.toArray();
  return blobs.reduce((sum, b) => sum + b.size_bytes, 0);
}

export async function isDocumentOffline(documentId: string): Promise<boolean> {
  return (await offlineDb.document_blobs.get(documentId)) !== undefined;
}

/**
 * Télécharge le document tel que servi par le viewer authentifié
 * (audit et, après E03b, filigrane compris) et le range dans IndexedDB.
 */
export async function saveDocumentOffline(
  documentId: string,
  fileName: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
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
    file_name: fileName,
    mime_type: blob.type,
    size_bytes: blob.size,
    blob,
    savedAt: new Date().toISOString(),
  });
  return { ok: true };
}

export async function removeDocumentOffline(documentId: string): Promise<void> {
  await offlineDb.document_blobs.delete(documentId);
}

/** Ouvre un document offline dans un nouvel onglet via une object URL. */
export async function openOfflineDocument(documentId: string): Promise<boolean> {
  const entry = await offlineDb.document_blobs.get(documentId);
  if (!entry) {
    return false;
  }
  const url = URL.createObjectURL(entry.blob);
  window.open(url, "_blank");
  return true;
}
