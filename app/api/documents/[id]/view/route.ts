import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";
import { logVaultAccess } from "@/lib/vault/audit";
import { canWatermark, watermarkImage, watermarkPdf } from "@/lib/vault/watermark";
import { isVaultUnlocked } from "@/lib/webauthn/vault-session";

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

  // E03b : verrou passkey sur les documents du coffre.
  if (doc.scope === "VAULT") {
    const { data: passkeys } = await supabase
      .from("user_passkeys")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);
    if ((passkeys ?? []).length > 0 && !(await isVaultUnlocked(user.id))) {
      return Response.json(
        { error: "Coffre verrouillé — déverrouille-le d'abord." },
        { status: 403 },
      );
    }
  }

  const admin = createAdminClient();
  const { data: blob, error } = await admin.storage.from("documents").download(doc.storage_path);
  if (error || !blob) {
    return Response.json({ error: "Fichier indisponible" }, { status: 502 });
  }

  let body: BodyInit = blob;
  let contentType = doc.mime_type;
  let fileName = doc.file_name;

  if (doc.scope === "VAULT") {
    // E03b : filigrane dynamique (E06). HEIC non pris en charge : servi tel quel.
    if (canWatermark(doc.mime_type)) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const viewerEmail = user.email ?? "voyageur@phil";
      const marked =
        doc.mime_type === "application/pdf"
          ? await watermarkPdf(bytes, viewerEmail)
          : await watermarkImage(bytes, doc.mime_type, viewerEmail);
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
