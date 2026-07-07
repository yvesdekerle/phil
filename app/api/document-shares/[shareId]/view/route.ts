import { logger } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";
import { logVaultAccess } from "@/lib/vault/audit";

/**
 * Sert le blob filigrané DÉDIÉ d'un partage (PHIL-T01). Contenu chiffré (E2EE),
 * déchiffré côté client par le destinataire. L'accès est borné par la RLS de
 * document_shares (le destinataire voit sa ligne). VIEW logué dans l'audit.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  if (!areUuids(shareId)) {
    return Response.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Authentification requise" }, { status: 401 });
  }

  const { data: share } = await supabase
    .from("document_shares")
    .select("storage_path, document_id, documents(owner_id)")
    .eq("id", shareId)
    .maybeSingle();
  if (!share?.storage_path) {
    return Response.json({ error: "Partage introuvable" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: blob, error } = await admin.storage.from("documents").download(share.storage_path);
  if (error || !blob) {
    logger.error("share_blob_download_failed", { shareId, code: error?.name });
    return Response.json({ error: "Fichier indisponible" }, { status: 502 });
  }

  await logVaultAccess({
    action: "VIEW",
    documentId: share.document_id,
    accessedBy: user.id,
    documentOwnerId: share.documents?.owner_id ?? user.id,
  });

  return new Response(blob, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "private, no-store",
    },
  });
}
