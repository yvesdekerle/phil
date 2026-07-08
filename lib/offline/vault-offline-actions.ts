"use server";

import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";

/**
 * Métadonnées nécessaires pour garder un document du coffre offline et le
 * déchiffrer plus tard (PHIL-T01 Phase 4b). Réservé au propriétaire d'un
 * document `scope=VAULT` (double garde : RLS + vérification explicite).
 * Le serveur ne renvoie ici que du chiffré/emballé — jamais la clé ni le clair.
 */
export type VaultOfflineMeta = {
  encrypted: boolean;
  mimeType: string;
  fileName: string;
  category: string;
  uploadedAt: string;
  wrappedDek: string;
  dekIv: string;
  fileIv: string;
};

export async function getVaultOfflineMeta(documentId: string): Promise<VaultOfflineMeta | null> {
  if (!areUuids(documentId)) {
    return null;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  const { data: doc } = await supabase
    .from("documents")
    .select(
      "owner_id, scope, encrypted, mime_type, file_name, category, uploaded_at, enc_wrapped_dek, enc_dek_iv, enc_file_iv",
    )
    .eq("id", documentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!doc || doc.scope !== "VAULT" || doc.owner_id !== user.id) {
    return null;
  }
  return {
    encrypted: Boolean(doc.encrypted),
    mimeType: doc.mime_type,
    fileName: doc.file_name,
    category: doc.category as string,
    uploadedAt: doc.uploaded_at,
    wrappedDek: doc.enc_wrapped_dek ?? "",
    dekIv: doc.enc_dek_iv ?? "",
    fileIv: doc.enc_file_iv ?? "",
  };
}
