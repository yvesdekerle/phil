"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { geocode } from "@/lib/geo/geocode";
import { createClient } from "@/lib/supabase/server";

const tripUpdateSchema = z
  .object({
    tripId: z.string().uuid(),
    name: z.string().trim().min(1, "Donne un nom à ce voyage.").max(100),
    destination: z.string().trim().min(1, "Où va-t-on ?").max(100),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de départ invalide."),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de retour invalide."),
    coverImageUrl: z
      .union([
        z.literal(""),
        z.string().url("URL invalide.").startsWith("https://", "URL en https uniquement."),
      ])
      .optional(),
    timezone: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz), {
      message: "Fuseau horaire inconnu.",
    }),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "Le retour ne peut pas précéder le départ.",
    path: ["endDate"],
  });

export type TripSettingsState = {
  status: "idle" | "success" | "error";
  message?: string;
};

async function getMyRole(tripId: string): Promise<{ role: string | null; userId: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { role: null, userId: null };
  }
  const { data } = await supabase
    .from("trip_participants")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .single();
  return { role: data?.role ?? null, userId: user.id };
}

export async function updateTrip(
  _prev: TripSettingsState,
  formData: FormData,
): Promise<TripSettingsState> {
  const parsed = tripUpdateSchema.safeParse({
    tripId: formData.get("tripId"),
    name: formData.get("name"),
    destination: formData.get("destination"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    coverImageUrl: formData.get("coverImageUrl") ?? "",
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  }

  const supabase = await createClient();
  // PHIL-O02 : re-géocoder la destination (météo). Si le géocodage échoue et
  // que la destination a changé, on efface les coordonnées devenues fausses.
  const { data: before } = await supabase
    .from("trips")
    .select("destination")
    .eq("id", parsed.data.tripId)
    .single();
  const coords = await geocode(parsed.data.destination);
  const coordsPatch = coords
    ? { destination_lat: coords.lat, destination_lng: coords.lng }
    : before && before.destination !== parsed.data.destination
      ? { destination_lat: null, destination_lng: null }
      : {};
  const { error, count } = await supabase
    .from("trips")
    .update(
      {
        name: parsed.data.name,
        destination: parsed.data.destination,
        ...coordsPatch,
        start_date: parsed.data.startDate,
        end_date: parsed.data.endDate,
        cover_image_url: parsed.data.coverImageUrl || null,
        default_timezone: parsed.data.timezone,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.tripId);

  if (error || count === 0) {
    return {
      status: "error",
      message: "La modification a échoué — il faut être capitaine ou éditeur du voyage.",
    };
  }

  revalidatePath(`/trips/${parsed.data.tripId}`);
  return { status: "success", message: "C'est noté dans le carnet." };
}

/** Enregistre la couverture téléversée (PHIL-D09) : URL construite côté serveur. */
export async function setCoverFromUpload(
  tripId: string,
  storagePath: string,
): Promise<TripSettingsState> {
  const pathSchema = z
    .string()
    .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/, "Chemin invalide.");
  const parsed = pathSchema.safeParse(storagePath);
  if (!parsed.success || !storagePath.startsWith(`${tripId}/`)) {
    return { status: "error", message: "Chemin de fichier invalide." };
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = `${base}/storage/v1/object/public/covers/${parsed.data}`;

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("trips")
    .update({ cover_image_url: url }, { count: "exact" })
    .eq("id", tripId);

  if (error || count === 0) {
    return { status: "error", message: "Impossible d'enregistrer la couverture." };
  }

  revalidatePath(`/trips/${tripId}`);
  return { status: "success", message: "Couverture mise à jour." };
}

export async function setTripArchived(
  tripId: string,
  archived: boolean,
): Promise<TripSettingsState> {
  // Archivage réservé à l'OWNER : la policy RLS UPDATE couvre OWNER et EDITOR,
  // la restriction plus fine se fait ici.
  const { role } = await getMyRole(tripId);
  if (role !== "OWNER") {
    return { status: "error", message: "Seul le capitaine peut archiver le voyage." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("trips")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", tripId);

  if (error) {
    return { status: "error", message: "L'archivage a échoué. Réessaie dans un instant." };
  }

  revalidatePath(`/trips/${tripId}`);
  return {
    status: "success",
    message: archived ? "Voyage rangé dans les archives." : "Voyage ressorti des archives.",
  };
}

export async function deleteTrip(tripId: string): Promise<TripSettingsState> {
  const { role } = await getMyRole(tripId);
  if (role !== "OWNER") {
    return { status: "error", message: "Seul le capitaine peut supprimer le voyage." };
  }

  const supabase = await createClient();
  // La suppression cascade sur trip_participants ; les futurs contenus liés
  // (events, idées, documents, invitations) seront purgés par leurs FK on delete cascade.
  const { error } = await supabase.from("trips").delete().eq("id", tripId);

  if (error) {
    return { status: "error", message: "La suppression a échoué. Réessaie dans un instant." };
  }

  redirect("/trips");
}
