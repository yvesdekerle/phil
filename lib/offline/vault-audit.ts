import { offlineDb } from "./db";
import { logDeferredVaultViews } from "./vault-audit-actions";

/**
 * Audit différé des consultations offline du coffre (PHIL-T01 Phase 5b). Une
 * ouverture hors ligne ne peut pas écrire dans `vault_access_log` : on la met en
 * file locale et on la rejoue dès qu'on est en ligne (`flushVaultAudit`).
 */

/** Enfile une consultation (VIEW) ; tente un envoi immédiat si on est en ligne. */
export async function enqueueVaultAudit(documentId: string): Promise<void> {
  await offlineDb.vault_audit_queue.add({ document_id: documentId, at: new Date().toISOString() });
  if (typeof navigator !== "undefined" && navigator.onLine) {
    void flushVaultAudit().catch(() => {});
  }
}

/** Rejoue la file d'audit vers le serveur ; ne vide que ce qui a été accepté. */
export async function flushVaultAudit(): Promise<void> {
  const entries = await offlineDb.vault_audit_queue.toArray();
  if (entries.length === 0) {
    return;
  }
  const res = await logDeferredVaultViews(
    entries.map((e) => ({ documentId: e.document_id, at: e.at })),
  );
  if (res.ok) {
    await offlineDb.vault_audit_queue.bulkDelete(
      entries.map((e) => e.id).filter((id): id is number => id !== undefined),
    );
  }
}
