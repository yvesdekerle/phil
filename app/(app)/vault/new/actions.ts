"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logVaultAccess } from "@/lib/vault/audit";
import { CATEGORIES } from "@/lib/vault/categories";
import { isAllowedMimeType, MAX_FILE_SIZE_BYTES } from "@/lib/vault/upload";

const createDocumentSchema = z.object({
  documentId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().refine(isAllowedMimeType, "Format non accepté."),
  sizeBytes: z.coerce.number().int().positive().max(MAX_FILE_SIZE_BYTES),
  storagePath: z.string().min(1),
  category: z.enum(CATEGORIES as [string, ...string[]]),
  expiresAt: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  documentNumber: z.string().trim().max(100).optional(),
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
  const parsed = createDocumentSchema.safeParse({
    documentId: formData.get("documentId"),
    fileName: formData.get("fileName"),
    mimeType: formData.get("mimeType"),
    sizeBytes: formData.get("sizeBytes"),
    storagePath: formData.get("storagePath"),
    category: formData.get("category"),
    expiresAt: formData.get("expiresAt") ?? "",
    documentNumber: formData.get("documentNumber") ?? "",
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Saisie invalide." };
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
    return { status: "error", message: "Chemin de stockage invalide." };
  }

  const metadata: Record<string, string> = {};
  if (parsed.data.documentNumber) {
    metadata.document_number = parsed.data.documentNumber;
  }

  const { error } = await supabase.from("documents").insert({
    id: parsed.data.documentId,
    owner_id: user.id,
    scope: "VAULT",
    file_name: parsed.data.fileName,
    mime_type: parsed.data.mimeType,
    size_bytes: parsed.data.sizeBytes,
    storage_path: parsed.data.storagePath,
    category: parsed.data.category as (typeof CATEGORIES)[number],
    expires_at: parsed.data.expiresAt || null,
    metadata,
  });

  if (error) {
    // La ligne n'a pas pu être créée : on retire le blob orphelin.
    const admin = createAdminClient();
    await admin.storage.from("documents").remove([parsed.data.storagePath]);
    return { status: "error", message: "L'enregistrement a échoué. Réessaie dans un instant." };
  }

  await logVaultAccess({
    action: "UPLOAD",
    documentId: parsed.data.documentId,
    accessedBy: user.id,
    documentOwnerId: user.id,
  });

  redirect("/vault");
}
