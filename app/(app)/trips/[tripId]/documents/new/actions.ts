"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getT } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { TRIP_CATEGORIES } from "@/lib/vault/categories";
import { isAllowedMimeType, MAX_FILE_SIZE_BYTES } from "@/lib/vault/upload";

const createTripDocumentSchema = z.object({
  documentId: z.string().uuid(),
  tripId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().refine(isAllowedMimeType, "Format non accepté."),
  sizeBytes: z.coerce.number().int().positive().max(MAX_FILE_SIZE_BYTES),
  storagePath: z.string().min(1),
  category: z.enum(TRIP_CATEGORIES as [string, ...string[]]),
  expiresAt: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  // PHIL-Q26 : libellé libre + rattachement direct à un événement
  label: z.string().trim().max(60).optional(),
  eventId: z.union([z.literal(""), z.string().uuid()]).optional(),
});

/** Catégorie déduite du libellé libre — garde les filtres existants pertinents. */
function categoryFromLabel(label: string): (typeof TRIP_CATEGORIES)[number] {
  const n = label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (n.includes("billet") || n.includes("ticket") || n.includes("forfait")) return "ticket";
  if (n.includes("voucher") || n.includes("reservation")) return "voucher";
  if (n.includes("hebergement") || n.includes("hotel") || n.includes("villa")) return "lodging";
  if (n.includes("assurance")) return "insurance";
  return "other";
}

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
    label: formData.get("label") ?? "",
    eventId: formData.get("eventId") ?? "",
  });

  const t = await getT();
  if (!parsed.success) {
    const isMime = parsed.error.issues.some((i) => i.path[0] === "mimeType");
    return { status: "error", message: t(isMime ? "tripDocs.badFormat" : "tripDocs.invalidInput") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  if (!parsed.data.storagePath.startsWith(`${user.id}/${parsed.data.documentId}`)) {
    return { status: "error", message: t("tripDocs.invalidStoragePath") };
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
    category: parsed.data.label
      ? categoryFromLabel(parsed.data.label)
      : (parsed.data.category as (typeof TRIP_CATEGORIES)[number]),
    label: parsed.data.label || null,
    expires_at: parsed.data.expiresAt || null,
    metadata: {},
  });

  if (error) {
    const admin = createAdminClient();
    await admin.storage.from("documents").remove([parsed.data.storagePath]);
    return {
      status: "error",
      message: t("tripDocs.saveFailed"),
    };
  }

  // PHIL-Q26 : rattachement direct à un événement choisi à l'upload
  if (parsed.data.eventId) {
    await supabase
      .from("event_documents")
      .insert({ event_id: parsed.data.eventId, document_id: parsed.data.documentId });
    redirect(`/trips/${parsed.data.tripId}/events/${parsed.data.eventId}`);
  }

  redirect(`/trips/${parsed.data.tripId}/documents`);
}
