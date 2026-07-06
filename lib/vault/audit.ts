import "server-only";
import { headers } from "next/headers";
import { logger } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

export type VaultAction = Database["public"]["Enums"]["vault_action"];

/**
 * Trace une opération sur un document du coffre dans vault_access_log.
 * Écrit via service role (la table n'accepte aucune écriture authenticated).
 * Ne doit jamais faire échouer l'opération métier : les erreurs sont avalées
 * mais loggées côté serveur.
 */
export async function logVaultAccess(params: {
  action: VaultAction;
  documentId: string;
  accessedBy: string;
  documentOwnerId: string;
}): Promise<void> {
  try {
    const headerStore = await headers();
    const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = headerStore.get("user-agent") ?? null;

    const admin = createAdminClient();
    const { error } = await admin.from("vault_access_log").insert({
      document_id: params.documentId,
      accessed_by: params.accessedBy,
      document_owner_id: params.documentOwnerId,
      action: params.action,
      ip_address: ip,
      user_agent: userAgent,
    });
    if (error) {
      logger.error("vault_audit_insert_failed", {
        action: params.action,
        documentId: params.documentId,
        code: error.code,
      });
    }
  } catch {
    logger.error("vault_audit_unexpected", {
      action: params.action,
      documentId: params.documentId,
    });
  }
}
