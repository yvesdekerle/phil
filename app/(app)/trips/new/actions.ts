"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/forms/action-state";
import { geocode } from "@/lib/geo/geocode";
import { getT } from "@/lib/i18n/server";
import { logger } from "@/lib/observability/logger";
import { createClient } from "@/lib/supabase/server";
import { ingestCoverUrl } from "@/lib/trips/cover-fetch";
import { getTemplate } from "@/lib/trips/templates";

export type CreateTripState = ActionState;

export async function createTrip(
  _prev: CreateTripState,
  formData: FormData,
): Promise<CreateTripState> {
  const t = await getT();
  const tripSchema = z
    .object({
      name: z.string().trim().min(1, t("newTrip.msg.nameRequired")).max(100),
      destination: z.string().trim().min(1, t("newTrip.msg.destinationRequired")).max(100),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t("newTrip.msg.startDateInvalid")),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t("newTrip.msg.endDateInvalid")),
      coverImageUrl: z
        .union([
          z.literal(""),
          z
            .string()
            .url(t("newTrip.msg.urlInvalid"))
            .startsWith("https://", t("newTrip.msg.urlHttps")),
        ])
        .optional(),
      timezone: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz), {
        message: t("newTrip.msg.timezoneUnknown"),
      }),
    })
    .refine((v) => v.endDate >= v.startDate, {
      message: t("newTrip.msg.endBeforeStart"),
      path: ["endDate"],
    });

  const parsed = tripSchema.safeParse({
    name: formData.get("name"),
    destination: formData.get("destination"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    coverImageUrl: formData.get("coverImageUrl") ?? "",
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? t("newTrip.msg.invalidInput"),
    };
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
  // PHIL-O02 : coordonnées de la destination pour la météo (best-effort)
  const coords = await geocode(parsed.data.destination);
  const { error } = await supabase.from("trips").insert({
    id: tripId,
    name: parsed.data.name,
    destination: parsed.data.destination,
    destination_lat: coords?.lat ?? null,
    destination_lng: coords?.lng ?? null,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
    // Couverture posée après coup : l'ingestion R09 a besoin du voyage créé
    // (le trigger AFTER INSERT rend l'utilisateur membre → upload `covers` permis).
    cover_image_url: null,
    default_timezone: parsed.data.timezone,
    created_by: user.id,
  });

  if (error) {
    return { status: "error", message: t("newTrip.msg.createFailed") };
  }

  // Couverture par URL : téléchargée chez nous (garde anti-SSRF R09) puis servie
  // depuis notre bucket. Échec non bloquant — le voyage existe, la couverture se
  // repose depuis les réglages avec un message d'erreur explicite.
  if (parsed.data.coverImageUrl) {
    const ingested = await ingestCoverUrl(supabase, tripId, parsed.data.coverImageUrl);
    if (ingested.ok) {
      await supabase.from("trips").update({ cover_image_url: ingested.url }).eq("id", tripId);
    } else {
      logger.warn("new_trip_cover_ingest_failed", { tripId, reason: ingested.error });
    }
  }

  // PHIL-N03 : un template pré-remplit le pool d'idées
  const template = getTemplate(formData.get("template") as string | null);
  if (template) {
    await supabase.from("trip_ideas").insert(
      template.ideas.map((i) => ({
        trip_id: tripId,
        title: i.title,
        description: i.description ?? null,
        tags: i.tags,
        created_by: user.id,
      })),
    );
    if (template.checklist.length > 0) {
      await supabase.from("checklist_items").insert(
        template.checklist.map((c) => ({
          trip_id: tripId,
          section: c.section,
          title: c.title,
          created_by: user.id,
        })),
      );
    }
  }

  redirect("/trips");
}
