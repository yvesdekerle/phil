"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";
import { logVaultAccess } from "@/lib/vault/audit";

export type TripDocActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

/**
 * Suppression d'un document du voyage (PHIL-G04).
 * Droit porté par la RLS DELETE : propriétaire du document, ou OWNER du
 * voyage pour les documents scope=TRIP (règle critique n°5).
 */
export async function deleteTripDocument(
  tripId: string,
  documentId: string,
): Promise<TripDocActionState> {
  const t = await getT();
  if (!areUuids(tripId, documentId)) {
    return { status: "error", message: t("tripDocs.invalidIds") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("id, owner_id, scope, trip_id, storage_path")
    .eq("id", documentId)
    .single();

  if (!doc || doc.scope !== "TRIP" || doc.trip_id !== tripId) {
    // Les documents du coffre partagés se gèrent depuis le coffre (partage/retrait).
    return { status: "error", message: t("tripDocs.notFound") };
  }

  const { error, count } = await supabase
    .from("documents")
    .delete({ count: "exact" })
    .eq("id", documentId);

  if (error || count === 0) {
    return {
      status: "error",
      message: t("tripDocs.deleteDenied"),
    };
  }

  const admin = createAdminClient();
  await admin.storage.from("documents").remove([doc.storage_path]);
  await logVaultAccess({
    action: "DELETE",
    documentId: doc.id,
    accessedBy: user.id,
    documentOwnerId: doc.owner_id,
  });

  revalidatePath(`/trips/${tripId}/documents`);
  return { status: "success", message: t("tripDocs.deleted") };
}
