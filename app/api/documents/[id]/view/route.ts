import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logVaultAccess } from "@/lib/vault/audit";

/**
 * Sert le fichier d'un document en inline (PHIL-E03a).
 * Le droit d'accès est entièrement porté par la RLS : le SELECT passe par le
 * client de session (propriétaire, participant du voyage, ou partage explicite).
 * Le blob est lu via service role — le bucket n'a aucune policy de lecture,
 * ce chemin est donc le seul, et il logge les consultations du coffre.
 * Durcissement (filigrane, session vault) : PHIL-E03b en Phase 9.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Authentification requise" }, { status: 401 });
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!doc) {
    // Inexistant ou hors de portée RLS : même réponse.
    return Response.json({ error: "Document introuvable" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: blob, error } = await admin.storage.from("documents").download(doc.storage_path);
  if (error || !blob) {
    return Response.json({ error: "Fichier indisponible" }, { status: 502 });
  }

  if (doc.scope === "VAULT") {
    await logVaultAccess({
      action: "VIEW",
      documentId: doc.id,
      accessedBy: user.id,
      documentOwnerId: doc.owner_id,
    });
  }

  return new Response(blob, {
    headers: {
      "Content-Type": doc.mime_type,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.file_name)}`,
      "Content-Length": String(doc.size_bytes),
      "Cache-Control": "private, no-store",
    },
  });
}
