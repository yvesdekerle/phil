"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getT } from "@/lib/i18n/server";
import { logger } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logVaultAccess } from "@/lib/vault/audit";
import { VAULT_CATEGORIES } from "@/lib/vault/categories";
import { isAllowedMimeType, MAX_FILE_SIZE_BYTES } from "@/lib/vault/upload";

// Fabrique du schéma (PHIL-R15) : `t` est requis pour localiser le message du
// refine mime, seul message de validation susceptible d'être remonté à l'UI.
const buildCreateDocumentSchema = (t: (key: string) => string) =>
  z.object({
    documentId: z.string().uuid(),
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.string().refine(isAllowedMimeType, t("documents.msg.badFormat")),
    sizeBytes: z.coerce.number().int().positive().max(MAX_FILE_SIZE_BYTES),
    storagePath: z.string().min(1),
    category: z.enum(VAULT_CATEGORIES as [string, ...string[]]),
    expiresAt: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
    documentNumber: z.string().trim().max(100).optional(),
    // PHIL-Q34 : "Autre" → libellé libre saisi à la main
    label: z.string().trim().max(60).optional(),
    // PHIL-T01 : métadonnées de chiffrement E2EE (base64), présentes si chiffré.
    encrypted: z.union([z.literal(""), z.literal("1")]).optional(),
    encFileIv: z.string().max(64).optional(),
    encWrappedDek: z.string().max(255).optional(),
    encDekIv: z.string().max(64).optional(),
    // PHIL-R10 : n° de pièce chiffré E2EE (base64), en lieu et place du clair.
    encDocumentNumber: z.string().max(255).optional(),
    encDocumentNumberIv: z.string().max(64).optional(),
  });

export type CreateDocumentState = {
  status: "idle" | "error";
  message?: string;
};

/**
 * Enregistre en base un document déjà uploadé dans Storage par le client
 * (le fichier est monté directement vers le bucket : les fonctions Vercel
 * limitent le body à ~4,5 Mo). Logge UPLOAD dans vault_access_log.
 */
export async function createDocument(
  _prev: CreateDocumentState,
  formData: FormData,
): Promise<CreateDocumentState> {
  const t = await getT();
  const parsed = buildCreateDocumentSchema(t).safeParse({
    documentId: formData.get("documentId"),
    fileName: formData.get("fileName"),
    mimeType: formData.get("mimeType"),
    sizeBytes: formData.get("sizeBytes"),
    storagePath: formData.get("storagePath"),
    category: formData.get("category"),
    expiresAt: formData.get("expiresAt") ?? "",
    documentNumber: formData.get("documentNumber") ?? "",
    label: formData.get("label") ?? "",
    encrypted: formData.get("encrypted") ?? "",
    encFileIv: formData.get("encFileIv") ?? "",
    encWrappedDek: formData.get("encWrappedDek") ?? "",
    encDekIv: formData.get("encDekIv") ?? "",
    encDocumentNumber: formData.get("encDocumentNumber") ?? "",
    encDocumentNumberIv: formData.get("encDocumentNumberIv") ?? "",
  });

  if (!parsed.success) {
    logger.warn("document_create_invalid_input", { code: parsed.error.issues[0]?.code });
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? t("documents.msg.invalidInput"),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Le chemin doit vivre dans le dossier de l'utilisateur (même règle que la
  // policy storage) et correspondre au document déclaré.
  if (!parsed.data.storagePath.startsWith(`${user.id}/${parsed.data.documentId}`)) {
    return { status: "error", message: t("documents.msg.storagePathInvalid") };
  }

  // PHIL-T01 : document chiffré E2EE → les trois métadonnées sont obligatoires.
  const isEncrypted = parsed.data.encrypted === "1";

  // PHIL-R10 : chiffré → n° stocké chiffré (enc_document_number) ; sinon → clair
  // (doc voyage legacy uniquement). Jamais de n° en clair sur un doc chiffré.
  const metadata: Record<string, string> = {};
  if (isEncrypted) {
    if (parsed.data.encDocumentNumber && parsed.data.encDocumentNumberIv) {
      metadata.enc_document_number = parsed.data.encDocumentNumber;
      metadata.enc_document_number_iv = parsed.data.encDocumentNumberIv;
    }
  } else if (parsed.data.documentNumber) {
    metadata.document_number = parsed.data.documentNumber;
  }

  if (
    isEncrypted &&
    (!parsed.data.encFileIv || !parsed.data.encWrappedDek || !parsed.data.encDekIv)
  ) {
    return { status: "error", message: t("documents.msg.encryptionMetaMissing") };
  }

  const { error } = await supabase.from("documents").insert({
    id: parsed.data.documentId,
    owner_id: user.id,
    scope: "VAULT",
    file_name: parsed.data.fileName,
    mime_type: parsed.data.mimeType,
    size_bytes: parsed.data.sizeBytes,
    storage_path: parsed.data.storagePath,
    category: parsed.data.category as (typeof VAULT_CATEGORIES)[number],
    // Libellé libre seulement quand la catégorie est "Autre" (sinon le libellé de catégorie suffit)
    label: parsed.data.category === "other" ? parsed.data.label || null : null,
    expires_at: parsed.data.expiresAt || null,
    metadata,
    encrypted: isEncrypted,
    enc_file_iv: isEncrypted ? parsed.data.encFileIv : null,
    enc_wrapped_dek: isEncrypted ? parsed.data.encWrappedDek : null,
    enc_dek_iv: isEncrypted ? parsed.data.encDekIv : null,
  });

  if (error) {
    logger.error("document_insert_failed", {
      documentId: parsed.data.documentId,
      userId: user.id,
      code: error.code,
    });
    // La ligne n'a pas pu être créée : on retire le blob orphelin.
    const admin = createAdminClient();
    await admin.storage.from("documents").remove([parsed.data.storagePath]);
    return { status: "error", message: t("documents.msg.saveFailed") };
  }

  await logVaultAccess({
    action: "UPLOAD",
    documentId: parsed.data.documentId,
    accessedBy: user.id,
    documentOwnerId: user.id,
  });

  redirect("/vault");
}
