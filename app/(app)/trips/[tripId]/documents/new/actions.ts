"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/vault/categories";
import { isAllowedMimeType, MAX_FILE_SIZE_BYTES } from "@/lib/vault/upload";

const createTripDocumentSchema = z.object({
  documentId: z.string().uuid(),
  tripId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().refine(isAllowedMimeType, "Format non accepté."),
  sizeBytes: z.coerce.number().int().positive().max(MAX_FILE_SIZE_BYTES),
  storagePath: z.string().min(1),
  category: z.enum(CATEGORIES as [string, ...string[]]),
  expiresAt: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
});

export type CreateTripDocumentState = {
  status: "idle" | "error";
  message?: string;
};

/**
 * Enregistre un document uploadé directement dans le voyage (scope=TRIP).
 * Visible immédiatement de tous les participants. La policy RLS d'insert
 * exige d'être OWNER ou EDITOR du voyage.
 */
export async function createTripDocument(
  _prev: CreateTripDocumentState,
  formData: FormData,
): Promise<CreateTripDocumentState> {
  const parsed = createTripDocumentSchema.safeParse({
    documentId: formData.get("documentId"),
    tripId: formData.get("tripId"),
    fileName: formData.get("fileName"),
    mimeType: formData.get("mimeType"),
    sizeBytes: formData.get("sizeBytes"),
    storagePath: formData.get("storagePath"),
    category: formData.get("category"),
    expiresAt: formData.get("expiresAt") ?? "",
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

  if (!parsed.data.storagePath.startsWith(`${user.id}/${parsed.data.documentId}`)) {
    return { status: "error", message: "Chemin de stockage invalide." };
  }

  const { error } = await supabase.from("documents").insert({
    id: parsed.data.documentId,
    owner_id: user.id,
    scope: "TRIP",
    trip_id: parsed.data.tripId,
    file_name: parsed.data.fileName,
    mime_type: parsed.data.mimeType,
    size_bytes: parsed.data.sizeBytes,
    storage_path: parsed.data.storagePath,
    category: parsed.data.category as (typeof CATEGORIES)[number],
    expires_at: parsed.data.expiresAt || null,
    metadata: {},
  });

  if (error) {
    const admin = createAdminClient();
    await admin.storage.from("documents").remove([parsed.data.storagePath]);
    return {
      status: "error",
      message: "L'enregistrement a échoué — il faut être capitaine ou éditeur du voyage.",
    };
  }

  redirect(`/trips/${parsed.data.tripId}/documents`);
}
