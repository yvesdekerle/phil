import { logger } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";
import { logVaultAccess } from "@/lib/vault/audit";
import { canWatermark, watermarkImage, watermarkPdf } from "@/lib/vault/watermark";

/**
 * Sert le fichier d'un document en inline (PHIL-E03a, durci par PHIL-E03b).
 * Le droit d'accès est porté par la RLS (client de session), le blob est lu
 * via service role — seul chemin de lecture, le bucket n'ayant aucune policy.
 *
 * Documents VAULT uniquement :
 *  - session « coffre déverrouillé » exigée si une passkey existe (C05) ;
 *  - filigrane dynamique à chaque ouverture (E06), images converties en PDF ;
 *  - consultation logguée (VIEW).
 * Les documents TRIP sont servis tels quels.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!areUuids(id)) {
    return Response.json({ error: "Identifiant invalide" }, { status: 400 });
  }

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

  // PHIL-T01 : document chiffré E2EE → servi tel quel (chiffré). Le déchiffrement
  // et le verrou biométrique se font côté client ; le serveur ne peut pas le lire.
  if (doc.encrypted) {
    const { data: encBlob, error: encError } = await admin.storage
      .from("documents")
      .download(doc.storage_path);
    if (encError || !encBlob) {
      logger.error("document_blob_download_failed", { documentId: id, code: encError?.name });
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
    return new Response(encBlob, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "private, no-store",
      },
    });
  }

  // Verrou biométrique : porté par la porte du coffre côté client (CoffreGate,
  // E2EE) ou l'ancien verrou HMAC selon l'activation. L'accès reste borné par la
  // RLS (client de session) ; les docs chiffrés sont de toute façon servis
  // chiffrés. Les docs non chiffrés reposent donc sur RLS + porte cliente.
  const { data: blob, error } = await admin.storage.from("documents").download(doc.storage_path);
  if (error || !blob) {
    logger.error("document_blob_download_failed", { documentId: id, code: error?.name });
    return Response.json({ error: "Fichier indisponible" }, { status: 502 });
  }

  let body: BodyInit = blob;
  let contentType = doc.mime_type;
  let fileName = doc.file_name;

  if (doc.scope === "VAULT") {
    // E03b : filigrane dynamique (E06). HEIC non pris en charge : servi tel quel.
    // Filigrane à l'email — uniquement pour un lecteur qui n'est PAS le propriétaire.
    if (canWatermark(doc.mime_type) && doc.owner_id !== user.id) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const viewer = user.email ?? user.id;
      const marked =
        doc.mime_type === "application/pdf"
          ? await watermarkPdf(bytes, viewer)
          : await watermarkImage(bytes, doc.mime_type, viewer);
      body = Buffer.from(marked);
      contentType = "application/pdf";
      if (!fileName.toLowerCase().endsWith(".pdf")) {
        fileName = `${fileName}.pdf`;
      }
    }

    await logVaultAccess({
      action: "VIEW",
      documentId: doc.id,
      accessedBy: user.id,
      documentOwnerId: doc.owner_id,
    });
  }

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
