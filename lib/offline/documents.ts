import { decryptBytes, fromBase64, unwrapKey } from "@/lib/crypto/vault-crypto";
import { offlineDb } from "./db";
import { enqueueVaultAudit } from "./vault-audit";
import { getOfflineMaster } from "./vault-crypto-cache";

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

/**
 * Ouvre un document offline dans un nouvel onglet via une object URL. Un document
 * chiffré (coffre, PHIL-T01 Phase 4b) est déchiffré EN MÉMOIRE après biométrie
 * locale avant d'être affiché — le clair ne touche jamais le disque.
 */
export async function openOfflineDocument(documentId: string): Promise<boolean> {
  const entry = await offlineDb.document_blobs.get(documentId);
  if (!entry) {
    return false;
  }
  let blob = entry.blob;
  if (entry.encrypted && entry.wrapped_dek && entry.dek_iv && entry.file_iv) {
    const master = await getOfflineMaster();
    const dek = await unwrapKey(master, fromBase64(entry.wrapped_dek), fromBase64(entry.dek_iv));
    const plain = await decryptBytes(
      dek,
      new Uint8Array(await entry.blob.arrayBuffer()),
      fromBase64(entry.file_iv),
    );
    blob = new Blob([plain as BlobPart], { type: entry.mime_type });
    // PHIL-T01 Phase 5b : consultation d'un doc chiffré → à auditer (différé si offline).
    await enqueueVaultAudit(documentId);
  }
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  return true;
}
