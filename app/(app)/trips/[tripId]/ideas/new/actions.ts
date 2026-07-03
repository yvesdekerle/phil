"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ideaSchema = z.object({
  tripId: z.string().uuid(),
  title: z.string().trim().min(1, "Donne un titre à cette idée.").max(150),
  description: z.string().trim().max(2000).optional(),
  externalUrl: z.union([z.literal(""), z.string().url("Lien invalide.")]).optional(),
  locationName: z.string().trim().max(150).optional(),
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

export type CreateIdeaState = {
  status: "idle" | "error";
  message?: string;
};

export async function createIdea(
  _prev: CreateIdeaState,
  formData: FormData,
): Promise<CreateIdeaState> {
  const parsed = ideaSchema.safeParse({
    tripId: formData.get("tripId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    externalUrl: formData.get("externalUrl") ?? "",
    locationName: formData.get("locationName") ?? "",
    durationMinutes: formData.get("durationMinutes") ?? "",
    cost: formData.get("cost") ?? "",
    costCurrency: formData.get("costCurrency") ?? "",
    tags: formData.get("tags") ?? "",
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

  const d = parsed.data;
  const tags = (d.tags ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
    .filter((t) => t.length > 0)
    .slice(0, 10);

  const { error } = await supabase.from("trip_ideas").insert({
    trip_id: d.tripId,
    title: d.title,
    description: d.description || null,
    external_url: d.externalUrl || null,
    location_name: d.locationName || null,
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

  redirect(`/trips/${d.tripId}/ideas`);
}
