"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/forms/action-state";
import { getT } from "@/lib/i18n/server";
import { logger } from "@/lib/observability/logger";
import { createClient } from "@/lib/supabase/server";
import { portableTripSchema } from "@/lib/trips/portable";

export type ImportTripState = ActionState;

const MAX_PAYLOAD_BYTES = 5_000_000; // 5 Mo — garde-fou avant parsing

/**
 * Import « voyage portable » (PHIL-Q19) — recrée un voyage complet à partir d'un
 * JSON exporté. L'importeur devient OWNER (trigger DB), tout le contenu est
 * réinséré avec de nouveaux identifiants sous le nouveau `trip_id`. Aucune
 * référence croisée à remapper (idées → POOL, candidats → OPEN par défaut).
 */
export async function importTrip(
  _prev: ImportTripState,
  formData: FormData,
): Promise<ImportTripState> {
  const t = await getT();
  const raw = formData.get("payload");
  if (typeof raw !== "string" || raw.length === 0) {
    return { status: "error", message: t("trips.import.errEmpty") };
  }
  if (raw.length > MAX_PAYLOAD_BYTES) {
    return { status: "error", message: t("trips.import.errTooLarge") };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { status: "error", message: t("trips.import.errInvalidJson") };
  }

  const parsed = portableTripSchema.safeParse(json);
  if (!parsed.success) {
    return { status: "error", message: t("trips.import.errInvalidFormat") };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Nouveau voyage : UUID côté serveur, insert sans RETURNING (la policy SELECT
  // n'est satisfaite qu'après le trigger AFTER INSERT qui pose l'OWNER — cf. B09).
  const tripId = randomUUID();
  const { error: tripError } = await supabase.from("trips").insert({
    id: tripId,
    name: data.trip.name,
    destination: data.trip.destination,
    destination_lat: data.trip.destination_lat,
    destination_lng: data.trip.destination_lng,
    start_date: data.trip.start_date,
    end_date: data.trip.end_date,
    cover_image_url: null,
    default_timezone: data.trip.default_timezone,
    created_by: user.id,
  });
  if (tripError) {
    logger.error("import_trip_failed", { step: "trip", userId: user.id });
    return { status: "error", message: t("trips.import.errCreate") };
  }

  // Atomicité best-effort : si un lot d'enfants échoue, on supprime le voyage
  // (cascade) pour ne pas laisser une coquille à moitié importée.
  const fail = async (step: string): Promise<ImportTripState> => {
    logger.error("import_trip_failed", { step, tripId, userId: user.id });
    await supabase.from("trips").delete().eq("id", tripId);
    return { status: "error", message: t("trips.import.errCreate") };
  };

  if (data.events.length > 0) {
    const { error } = await supabase.from("trip_events").insert(
      data.events.map((e) => ({
        trip_id: tripId,
        created_by: user.id,
        ...e,
        metadata: e.metadata ?? {},
      })),
    );
    if (error) {
      return fail("events");
    }
  }

  if (data.ideas.length > 0) {
    const { error } = await supabase
      .from("trip_ideas")
      .insert(data.ideas.map((i) => ({ trip_id: tripId, created_by: user.id, ...i })));
    if (error) {
      return fail("ideas");
    }
  }

  if (data.checklist.length > 0) {
    const { error } = await supabase
      .from("checklist_items")
      .insert(data.checklist.map((c) => ({ trip_id: tripId, created_by: user.id, ...c })));
    if (error) {
      return fail("checklist");
    }
  }

  if (data.lodgingCandidates.length > 0) {
    const { error } = await supabase
      .from("lodging_candidates")
      .insert(data.lodgingCandidates.map((c) => ({ trip_id: tripId, created_by: user.id, ...c })));
    if (error) {
      return fail("lodging");
    }
  }

  logger.info("import_trip", {
    tripId,
    userId: user.id,
    events: data.events.length,
    ideas: data.ideas.length,
    checklist: data.checklist.length,
    lodging: data.lodgingCandidates.length,
  });
  redirect(`/trips/${tripId}`);
}
