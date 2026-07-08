"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/forms/action-state";
import { geolocateIdea } from "@/lib/geo/locate";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export type CreateIdeaState = ActionState;

export async function createIdea(
  _prev: CreateIdeaState,
  formData: FormData,
): Promise<CreateIdeaState> {
  const t = await getT();
  const ideaSchema = z.object({
    tripId: z.string().uuid(),
    title: z.string().trim().min(1, t("ideas.msg.titleRequired")).max(150),
    description: z.string().trim().max(2000).optional(),
    externalUrl: z.union([z.literal(""), z.string().url(t("ideas.msg.linkInvalid"))]).optional(),
    locationName: z.string().trim().max(150).optional(),
    locationLat: z.union([z.literal(""), z.coerce.number().min(-90).max(90)]).optional(),
    locationLng: z.union([z.literal(""), z.coerce.number().min(-180).max(180)]).optional(),
    durationMinutes: z
      .union([
        z.literal(""),
        z.coerce
          .number()
          .int()
          .min(5)
          .max(60 * 24 * 7),
      ])
      .optional(),
    cost: z.union([z.literal(""), z.coerce.number().min(0).max(1000000)]).optional(),
    costCurrency: z.string().trim().max(3).optional(),
    tags: z.string().trim().max(300).optional(),
  });
  const parsed = ideaSchema.safeParse({
    tripId: formData.get("tripId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    externalUrl: formData.get("externalUrl") ?? "",
    locationName: formData.get("locationName") ?? "",
    locationLat: formData.get("locationLat") ?? "",
    locationLng: formData.get("locationLng") ?? "",
    durationMinutes: formData.get("durationMinutes") ?? "",
    cost: formData.get("cost") ?? "",
    costCurrency: formData.get("costCurrency") ?? "",
    tags: formData.get("tags") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? t("ideas.msg.invalidInput"),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const d = parsed.data;
  const tags = (d.tags ?? "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase().replace(/^#/, ""))
    .filter((tag) => tag.length > 0)
    .slice(0, 10);

  // PHIL-P07 : coordonnées choisies via l'autocomplétion (sinon géocodage plus bas)
  const pickedCoords =
    typeof d.locationLat === "number" && typeof d.locationLng === "number"
      ? { lat: d.locationLat, lng: d.locationLng }
      : null;

  const ideaId = crypto.randomUUID();
  const { error } = await supabase.from("trip_ideas").insert({
    id: ideaId,
    trip_id: d.tripId,
    title: d.title,
    description: d.description || null,
    external_url: d.externalUrl || null,
    location_name: d.locationName || null,
    location_lat: pickedCoords?.lat ?? null,
    location_lng: pickedCoords?.lng ?? null,
    estimated_duration_minutes: d.durationMinutes || null,
    estimated_cost: d.cost === "" ? null : d.cost,
    cost_currency: d.cost !== "" && d.cost !== undefined ? d.costCurrency || "EUR" : null,
    tags,
    created_by: user.id,
  });

  if (error) {
    return {
      status: "error",
      message: "La création a échoué — il faut être capitaine ou éditeur du voyage.",
    };
  }

  if (!pickedCoords) {
    await geolocateIdea(supabase, d.tripId, ideaId, d.locationName);
  }

  redirect(`/trips/${d.tripId}/ideas`);
}
