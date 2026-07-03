"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const tripSchema = z
  .object({
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
    message: "Le retour ne peut pas précéder le départ — même Phileas n'y est pas arrivé.",
    path: ["endDate"],
  });

export type CreateTripState = {
  status: "idle" | "error";
  message?: string;
};

export async function createTrip(
  _prev: CreateTripState,
  formData: FormData,
): Promise<CreateTripState> {
  const parsed = tripSchema.safeParse({
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // id généré côté serveur + insert sans RETURNING : la policy SELECT n'est
  // satisfaite qu'après le trigger AFTER INSERT qui crée la ligne participant (cf. B09).
  const tripId = randomUUID();
  const { error } = await supabase.from("trips").insert({
    id: tripId,
    name: parsed.data.name,
    destination: parsed.data.destination,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
    cover_image_url: parsed.data.coverImageUrl || null,
    default_timezone: parsed.data.timezone,
    created_by: user.id,
  });

  if (error) {
    return { status: "error", message: "La création a échoué. Réessaie dans un instant." };
  }

  redirect("/trips");
}
