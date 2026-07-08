import { z } from "zod";

/**
 * Format « voyage portable » (PHIL-Q19) — sauvegarde / duplication / partage de
 * squelettes entre amis. On exporte le **contenu planifiable** d'un voyage
 * (événements, idées, valise, candidats hébergement) et **rien de personnel ni
 * de runtime** : ni documents/coffre, ni votes, ni participants, ni dépenses,
 * ni état collaboratif (`done`, `status`, liens `*_event_id`). À l'import, les
 * idées repartent en `POOL` et les candidats en `OPEN` — aucune référence
 * croisée à remapper.
 *
 * Ce module est la **source de vérité unique** partagée par l'export
 * (`app/api/trips/[tripId]/export`) et l'import (`importTrip`).
 */
export const PORTABLE_TRIP_VERSION = 1;

// Bornes anti-abus à l'import (cercle d'amis, mais on refuse un JSON monstrueux).
const LIMITS = { events: 1000, ideas: 1000, checklist: 2000, lodging: 500 } as const;

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** `metadata` d'un événement : objet plat de primitives (mode transport, réf., etc.). */
const eventMetadataSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  .nullable()
  .default(null);

const eventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: z.enum(["TRANSPORT", "LODGING", "ACTIVITY"]),
  starts_at: z.string().regex(ISO_DATETIME),
  ends_at: z.string().regex(ISO_DATETIME).nullable(),
  timezone: z.string().min(1).max(64),
  location_name: z.string().max(300).nullable(),
  location_address: z.string().max(500).nullable(),
  location_lat: z.number().min(-90).max(90).nullable(),
  location_lng: z.number().min(-180).max(180).nullable(),
  notes: z.string().max(5000).nullable(),
  metadata: eventMetadataSchema,
});

const ideaSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullable(),
  tags: z.array(z.string().max(50)).max(50),
  external_url: z.string().max(1000).nullable(),
  estimated_cost: z.number().nullable(),
  cost_currency: z.string().max(3).nullable(),
  estimated_duration_minutes: z.number().int().min(0).nullable(),
  location_name: z.string().max(300).nullable(),
  location_lat: z.number().min(-90).max(90).nullable(),
  location_lng: z.number().min(-180).max(180).nullable(),
});

const checklistItemSchema = z.object({
  section: z.string().min(1).max(100),
  category: z.string().max(100).nullable(),
  title: z.string().trim().min(1).max(200),
  quantity: z.string().max(50).nullable(),
  due_date: z.string().regex(ISO_DATE).nullable(),
  position: z.number().int().min(0),
});

const lodgingCandidateSchema = z
  .object({
    title: z.string().trim().min(1).max(150),
    url: z.string().max(1000).nullable(),
    price: z.string().max(100).nullable(),
    notes: z.string().max(1000).nullable(),
    check_in: z.string().regex(ISO_DATE),
    check_out: z.string().regex(ISO_DATE),
  })
  .refine((c) => c.check_out >= c.check_in, {
    message: "check_out must be on or after check_in",
    path: ["check_out"],
  });

const tripMetaSchema = z.object({
  name: z.string().trim().min(1).max(120),
  destination: z.string().trim().min(1).max(200),
  start_date: z.string().regex(ISO_DATE),
  end_date: z.string().regex(ISO_DATE),
  default_timezone: z.string().min(1).max(64),
  destination_lat: z.number().min(-90).max(90).nullable().default(null),
  destination_lng: z.number().min(-180).max(180).nullable().default(null),
});

export const portableTripSchema = z.object({
  version: z.literal(PORTABLE_TRIP_VERSION),
  exported_at: z.string().optional(),
  trip: tripMetaSchema,
  events: z.array(eventSchema).max(LIMITS.events).default([]),
  ideas: z.array(ideaSchema).max(LIMITS.ideas).default([]),
  checklist: z.array(checklistItemSchema).max(LIMITS.checklist).default([]),
  lodgingCandidates: z.array(lodgingCandidateSchema).max(LIMITS.lodging).default([]),
});

export type PortableTrip = z.infer<typeof portableTripSchema>;
export type PortableEvent = z.infer<typeof eventSchema>;
export type PortableIdea = z.infer<typeof ideaSchema>;
export type PortableChecklistItem = z.infer<typeof checklistItemSchema>;
export type PortableLodgingCandidate = z.infer<typeof lodgingCandidateSchema>;
