"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getT } from "@/lib/i18n/server";
import { MAX_PHOTO_BYTES, PHOTOS_PER_TRIP } from "@/lib/photos/limits";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";

const registerSchema = z.object({
  tripId: z.string().uuid(),
  photoId: z.string().uuid(),
  storagePath: z.string().min(1),
  thumbPath: z.string().optional(),
  sizeBytes: z.coerce.number().int().min(1).max(MAX_PHOTO_BYTES),
  caption: z.string().trim().max(300).optional(),
  eventId: z.union([z.literal(""), z.string().uuid()]).optional(),
  // PHIL-Q12 : position GPS EXIF extraite côté client
  lat: z.union([z.literal(""), z.coerce.number().min(-90).max(90)]).optional(),
  lng: z.union([z.literal(""), z.coerce.number().min(-180).max(180)]).optional(),
});

export type PhotoState = { status: "idle" | "error"; message?: string };

async function removeBlobs(paths: (string | null | undefined)[]): Promise<void> {
  const admin = createAdminClient();
  const existing = paths.filter((p): p is string => Boolean(p));
  if (existing.length > 0) {
    await admin.storage.from("photos").remove(existing);
  }
}

/**
 * Enregistre une photo déjà uploadée dans le bucket (PHIL-O10).
 * Quota strict par voyage : au-delà, les blobs sont purgés et l'ajout refusé.
 */
export async function registerPhoto(_prev: PhotoState, formData: FormData): Promise<PhotoState> {
  const t = await getT();
  const parsed = registerSchema.safeParse({
    tripId: formData.get("tripId"),
    photoId: formData.get("photoId"),
    storagePath: formData.get("storagePath"),
    thumbPath: formData.get("thumbPath") ?? undefined,
    sizeBytes: formData.get("sizeBytes"),
    caption: formData.get("caption") ?? "",
    eventId: formData.get("eventId") ?? "",
    lat: formData.get("lat") ?? "",
    lng: formData.get("lng") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: t("photos.invalidInput") };
  }
  const d = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Le chemin doit être dans le dossier de l'utilisateur et porter l'id de la photo
  if (
    !d.storagePath.startsWith(`${user.id}/${d.photoId}`) ||
    (d.thumbPath && !d.thumbPath.startsWith(`${user.id}/${d.photoId}`))
  ) {
    await removeBlobs([d.storagePath, d.thumbPath]);
    return { status: "error", message: t("photos.invalidPath") };
  }

  // Quota par voyage
  const { count } = await supabase
    .from("trip_photos")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", d.tripId);
  if ((count ?? 0) >= PHOTOS_PER_TRIP) {
    await removeBlobs([d.storagePath, d.thumbPath]);
    return {
      status: "error",
      message: t("photos.quotaReachedMsg").replace("{n}", String(PHOTOS_PER_TRIP)),
    };
  }

  const { error } = await supabase.from("trip_photos").insert({
    id: d.photoId,
    trip_id: d.tripId,
    uploaded_by: user.id,
    storage_path: d.storagePath,
    thumb_path: d.thumbPath || null,
    size_bytes: d.sizeBytes,
    caption: d.caption || null,
    event_id: d.eventId || null,
    lat: typeof d.lat === "number" ? d.lat : null,
    lng: typeof d.lng === "number" ? d.lng : null,
  });
  if (error) {
    await removeBlobs([d.storagePath, d.thumbPath]);
    return { status: "error", message: t("photos.saveFailed") };
  }

  revalidatePath(`/trips/${d.tripId}/photos`);
  return { status: "idle" };
}

export async function deletePhoto(tripId: string, photoId: string): Promise<void> {
  if (!areUuids(tripId, photoId)) {
    return;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // La RLS (auteur ou OWNER) décide ; les lignes supprimées donnent les chemins à purger
  const { data: deleted } = await supabase
    .from("trip_photos")
    .delete()
    .eq("id", photoId)
    .eq("trip_id", tripId)
    .select("storage_path, thumb_path");

  if (deleted && deleted.length > 0) {
    await removeBlobs(deleted.flatMap((r) => [r.storage_path, r.thumb_path]));
  }
  revalidatePath(`/trips/${tripId}/photos`);
}
