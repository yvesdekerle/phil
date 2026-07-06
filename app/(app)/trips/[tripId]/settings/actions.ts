"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { geocode } from "@/lib/geo/geocode";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

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

/** Active/révoque le partage public du voyage (PHIL-P03). OWNER uniquement. */
export async function setPublicSharing(tripId: string, enabled: boolean): Promise<void> {
  if (!z.string().uuid().safeParse(tripId).success) {
    return;
  }
  const { role } = await getMyRole(tripId);
  if (role !== "OWNER") {
    return;
  }
  const supabase = await createClient();
  await supabase
    .from("trips")
    .update({ public_token: enabled ? crypto.randomUUID() : null })
    .eq("id", tripId);
  revalidatePath(`/trips/${tripId}/settings`);
}

/** Génère l'alias d'import par email du voyage (PHIL-P02). RLS : OWNER/EDITOR. */
export async function generateEmailAlias(tripId: string): Promise<void> {
  if (!z.string().uuid().safeParse(tripId).success) {
    return;
  }
  const supabase = await createClient();
  const { data: trip } = await supabase
    .from("trips")
    .select("name, email_alias")
    .eq("id", tripId)
    .single();
  if (!trip || trip.email_alias) {
    return;
  }
  const slug = trip.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
  const suffix = crypto.randomUUID().slice(0, 4);
  const alias = `${slug || "voyage"}-${suffix}`;
  await supabase.from("trips").update({ email_alias: alias }).eq("id", tripId);
  revalidatePath(`/trips/${tripId}/settings`);
}

export async function updateTrip(
  _prev: TripSettingsState,
  formData: FormData,
): Promise<TripSettingsState> {
  const t = await getT();
  const tripUpdateSchema = z
    .object({
      tripId: z.string().uuid(),
      name: z.string().trim().min(1, t("settings.msg.nameRequired")).max(100),
      destination: z.string().trim().min(1, t("settings.msg.destinationRequired")).max(100),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t("settings.msg.startDateInvalid")),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t("settings.msg.endDateInvalid")),
      coverImageUrl: z
        .union([
          z.literal(""),
          z
            .string()
            .url(t("settings.msg.urlInvalid"))
            .startsWith("https://", t("settings.msg.urlHttps")),
        ])
        .optional(),
      whatsappGroupUrl: z
        .union([
          z.literal(""),
          z
            .string()
            .url(t("settings.msg.urlInvalid"))
            .regex(
              /^https:\/\/(chat\.whatsapp\.com|m\.me|(www\.)?messenger\.com)\//,
              t("settings.msg.whatsappInvalid"),
            ),
        ])
        .optional(),
      currencyPrimary: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{3}$/, t("settings.msg.currencyPrimaryInvalid")),
      currencySecondary: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^$|^[A-Z]{3}$/, t("settings.msg.currencySecondaryInvalid")),
      timezone: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz), {
        message: t("settings.msg.timezoneUnknown"),
      }),
    })
    .refine((v) => v.endDate >= v.startDate, {
      message: t("settings.msg.endBeforeStart"),
      path: ["endDate"],
    });

  const parsed = tripUpdateSchema.safeParse({
    tripId: formData.get("tripId"),
    name: formData.get("name"),
    destination: formData.get("destination"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    coverImageUrl: formData.get("coverImageUrl") ?? "",
    whatsappGroupUrl: formData.get("whatsappGroupUrl") ?? "",
    currencyPrimary: formData.get("currencyPrimary") ?? "EUR",
    currencySecondary: formData.get("currencySecondary") ?? "",
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? t("settings.msg.invalidInput"),
    };
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
        whatsapp_group_url: parsed.data.whatsappGroupUrl || null,
        currency_primary: parsed.data.currencyPrimary,
        currency_secondary: parsed.data.currencySecondary || null,
        default_timezone: parsed.data.timezone,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.tripId);

  if (error || count === 0) {
    return {
      status: "error",
      message: t("settings.msg.updateFailed"),
    };
  }

  revalidatePath(`/trips/${parsed.data.tripId}`);
  return { status: "success", message: t("settings.msg.updated") };
}

/** Enregistre la couverture téléversée (PHIL-D09) : URL construite côté serveur. */
export async function setCoverFromUpload(
  tripId: string,
  storagePath: string,
): Promise<TripSettingsState> {
  const pathSchema = z
    .string()
    .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/, "Chemin invalide.");
  const t = await getT();
  const parsed = pathSchema.safeParse(storagePath);
  if (!parsed.success || !storagePath.startsWith(`${tripId}/`)) {
    return { status: "error", message: t("settings.msg.invalidPath") };
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = `${base}/storage/v1/object/public/covers/${parsed.data}`;

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("trips")
    .update({ cover_image_url: url }, { count: "exact" })
    .eq("id", tripId);

  if (error || count === 0) {
    return { status: "error", message: t("settings.msg.coverSaveFailed") };
  }

  revalidatePath(`/trips/${tripId}`);
  return { status: "success", message: t("settings.msg.coverUpdated") };
}

/** Couverture depuis une URL collée directement (PHIL-Q37c). */
export async function setCoverFromUrl(tripId: string, rawUrl: string): Promise<TripSettingsState> {
  const t = await getT();
  const parsed = z.string().trim().min(1).max(2000).url().safeParse(rawUrl);
  if (!parsed.success || !parsed.data.startsWith("https://")) {
    return { status: "error", message: t("settings.cover.errUrl") };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("trips")
    .update({ cover_image_url: parsed.data }, { count: "exact" })
    .eq("id", tripId);

  if (error || count === 0) {
    return { status: "error", message: t("settings.msg.coverSaveFailed") };
  }

  revalidatePath(`/trips/${tripId}`);
  return { status: "success", message: t("settings.cover.done") };
}

export async function setTripArchived(
  tripId: string,
  archived: boolean,
): Promise<TripSettingsState> {
  // Archivage réservé à l'OWNER : la policy RLS UPDATE couvre OWNER et EDITOR,
  // la restriction plus fine se fait ici.
  const t = await getT();
  const { role } = await getMyRole(tripId);
  if (role !== "OWNER") {
    return { status: "error", message: t("settings.msg.onlyCaptainArchive") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("trips")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", tripId);

  if (error) {
    return { status: "error", message: t("settings.msg.archiveFailed") };
  }

  revalidatePath(`/trips/${tripId}`);
  return {
    status: "success",
    message: archived ? t("settings.msg.archived") : t("settings.msg.unarchived"),
  };
}

export async function deleteTrip(tripId: string): Promise<TripSettingsState> {
  const t = await getT();
  const { role } = await getMyRole(tripId);
  if (role !== "OWNER") {
    return { status: "error", message: t("settings.msg.onlyCaptainDelete") };
  }

  const supabase = await createClient();
  // La suppression cascade sur trip_participants ; les futurs contenus liés
  // (events, idées, documents, invitations) seront purgés par leurs FK on delete cascade.
  const { error } = await supabase.from("trips").delete().eq("id", tripId);

  if (error) {
    return { status: "error", message: t("settings.msg.deleteFailed") };
  }

  redirect("/trips");
}
