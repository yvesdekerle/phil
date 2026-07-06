"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";
import { logVaultAccess } from "@/lib/vault/audit";
import { CATEGORIES } from "@/lib/vault/categories";

export type DocumentActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function updateDocument(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const t = await getT();
  const updateDocumentSchema = z.object({
    documentId: z.string().uuid(),
    fileName: z.string().trim().min(1, t("documents.msg.nameRequired")).max(255),
    category: z.enum(CATEGORIES as [string, ...string[]]),
    expiresAt: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
    documentNumber: z.string().trim().max(100).optional(),
  });
  const parsed = updateDocumentSchema.safeParse({
    documentId: formData.get("documentId"),
    fileName: formData.get("fileName"),
    category: formData.get("category"),
    expiresAt: formData.get("expiresAt") ?? "",
    documentNumber: formData.get("documentNumber") ?? "",
  });

  if (!parsed.success) {
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

  const metadata: Record<string, string> = {};
  if (parsed.data.documentNumber) {
    metadata.document_number = parsed.data.documentNumber;
  }

  const { error, count } = await supabase
    .from("documents")
    .update(
      {
        file_name: parsed.data.fileName,
        category: parsed.data.category as (typeof CATEGORIES)[number],
        expires_at: parsed.data.expiresAt || null,
        metadata,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.documentId)
    .is("deleted_at", null);

  if (error || count === 0) {
    return { status: "error", message: t("documents.msg.updateFailed") };
  }

  await logVaultAccess({
    action: "UPDATE",
    documentId: parsed.data.documentId,
    accessedBy: user.id,
    documentOwnerId: user.id,
  });

  revalidatePath(`/vault/${parsed.data.documentId}`);
  revalidatePath("/vault");
  return { status: "success", message: t("documents.msg.updated") };
}

/**
 * Partage vers un voyage (PHIL-E05), ciblable vers une personne (PHIL-E09).
 * sharedWith null = tout l'équipage.
 */
export async function shareDocument(
  documentId: string,
  tripId: string,
  sharedWith: string | null = null,
  expiresAt: string | null = null,
): Promise<DocumentActionState> {
  const t = await getT();
  if (expiresAt !== null && Number.isNaN(Date.parse(expiresAt))) {
    return { status: "error", message: t("documents.msg.expiryInvalid") };
  }
  if (sharedWith !== null && !areUuids(sharedWith)) {
    return { status: "error", message: t("documents.msg.recipientInvalid") };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // La policy RLS d'insert vérifie : propriétaire du doc, doc VAULT,
  // et partage vers un voyage dont je suis participant.
  const { error } = await supabase.from("document_shares").insert({
    document_id: documentId,
    trip_id: tripId,
    shared_by: user.id,
    shared_with: sharedWith,
    expires_at: expiresAt,
  });

  if (error) {
    return {
      status: "error",
      message: error.message.includes("duplicate")
        ? t("documents.msg.shareExists")
        : t("documents.msg.shareFailed"),
    };
  }

  await logVaultAccess({
    action: "SHARE",
    documentId,
    accessedBy: user.id,
    documentOwnerId: user.id,
  });

  revalidatePath(`/vault/${documentId}`);
  return {
    status: "success",
    message: sharedWith ? t("documents.msg.sharedTargeted") : t("documents.msg.sharedCrew"),
  };
}

export async function unshareDocument(
  documentId: string,
  shareId: string,
): Promise<DocumentActionState> {
  const t = await getT();
  if (!areUuids(documentId, shareId)) {
    return { status: "error", message: t("documents.msg.invalidIds") };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error, count } = await supabase
    .from("document_shares")
    .delete({ count: "exact" })
    .eq("id", shareId)
    .eq("document_id", documentId);

  if (error || count === 0) {
    return { status: "error", message: t("documents.msg.unshareFailed") };
  }

  await logVaultAccess({
    action: "UNSHARE",
    documentId,
    accessedBy: user.id,
    documentOwnerId: user.id,
  });

  revalidatePath(`/vault/${documentId}`);
  return { status: "success", message: t("documents.msg.unshared") };
}

/**
 * Soft delete : deleted_at est posé, le blob Storage est conservé.
 * La purge définitive (blob + ligne) viendra avec la suppression de compte (C06)
 * ou un nettoyage périodique.
 */
export async function deleteDocument(documentId: string): Promise<DocumentActionState> {
  const t = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error, count } = await supabase
    .from("documents")
    .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", documentId)
    .is("deleted_at", null);

  if (error || count === 0) {
    return { status: "error", message: t("documents.msg.deleteFailed") };
  }

  await logVaultAccess({
    action: "DELETE",
    documentId,
    accessedBy: user.id,
    documentOwnerId: user.id,
  });

  redirect("/vault");
}
