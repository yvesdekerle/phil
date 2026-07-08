import { describe, expect, it } from "vitest";
import { PORTABLE_TRIP_VERSION, portableTripSchema } from "@/lib/trips/portable";

/**
 * Format « voyage portable » (PHIL-Q19) — le schéma est la frontière de confiance
 * de l'import : un JSON malformé doit être rejeté avant toute écriture en base.
 */

const validEvent = {
  title: "Vol Nice → Maurice",
  type: "TRANSPORT" as const,
  starts_at: "2026-11-05T10:00:00+00:00",
  ends_at: "2026-11-05T22:00:00+00:00",
  timezone: "Indian/Mauritius",
  location_name: "Aéroport de Nice",
  location_address: null,
  location_lat: 43.66,
  location_lng: 7.21,
  notes: null,
  metadata: { transport_mode: "plane", carrier: "Air France" },
};

const validTrip = {
  version: PORTABLE_TRIP_VERSION,
  exported_at: "2026-07-08T12:00:00.000Z",
  trip: {
    name: "Maurice 2026",
    destination: "Île Maurice",
    start_date: "2026-11-05",
    end_date: "2026-11-21",
    default_timezone: "Indian/Mauritius",
    destination_lat: -20.34,
    destination_lng: 57.55,
  },
  events: [validEvent],
  ideas: [
    {
      title: "Plongée au Morne",
      description: null,
      tags: ["mer", "sport"],
      external_url: null,
      estimated_cost: 60,
      cost_currency: "EUR",
      estimated_duration_minutes: 120,
      location_name: "Le Morne",
      location_lat: null,
      location_lng: null,
    },
  ],
  checklist: [
    {
      section: "Documents",
      category: null,
      title: "Passeport",
      quantity: null,
      due_date: null,
      position: 0,
    },
  ],
  lodgingCandidates: [
    {
      title: "Villa plage",
      url: "https://example.com",
      price: "120€/nuit",
      notes: null,
      check_in: "2026-11-06",
      check_out: "2026-11-12",
    },
  ],
};

describe("portableTripSchema — cas valides", () => {
  it("accepte un voyage complet", () => {
    const r = portableTripSchema.safeParse(validTrip);
    expect(r.success).toBe(true);
  });

  it("remplit les tableaux manquants par défaut", () => {
    const { events, ideas, checklist, lodgingCandidates, ...rest } = validTrip;
    void events;
    void ideas;
    void checklist;
    void lodgingCandidates;
    const r = portableTripSchema.safeParse(rest);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.events).toEqual([]);
      expect(r.data.ideas).toEqual([]);
      expect(r.data.checklist).toEqual([]);
      expect(r.data.lodgingCandidates).toEqual([]);
    }
  });

  it("met destination_lat/lng à null par défaut", () => {
    const trip = {
      name: "Sans coords",
      destination: "Quelque part",
      start_date: "2026-11-05",
      end_date: "2026-11-21",
      default_timezone: "Europe/Paris",
    };
    const r = portableTripSchema.safeParse({ version: PORTABLE_TRIP_VERSION, trip });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.trip.destination_lat).toBeNull();
    }
  });
});

describe("portableTripSchema — rejets", () => {
  it("rejette une version inconnue", () => {
    const r = portableTripSchema.safeParse({ ...validTrip, version: 99 });
    expect(r.success).toBe(false);
  });

  it("rejette un type d'événement inconnu", () => {
    const bad = { ...validTrip, events: [{ ...validEvent, type: "PARTY" }] };
    expect(portableTripSchema.safeParse(bad).success).toBe(false);
  });

  it("rejette une date d'événement non-ISO", () => {
    const bad = { ...validTrip, events: [{ ...validEvent, starts_at: "hier midi" }] };
    expect(portableTripSchema.safeParse(bad).success).toBe(false);
  });

  it("rejette un candidat dont check_out précède check_in", () => {
    const bad = {
      ...validTrip,
      lodgingCandidates: [
        {
          title: "Incohérent",
          url: null,
          price: null,
          notes: null,
          check_in: "2026-11-12",
          check_out: "2026-11-06",
        },
      ],
    };
    expect(portableTripSchema.safeParse(bad).success).toBe(false);
  });

  it("rejette un titre d'événement vide", () => {
    const bad = { ...validTrip, events: [{ ...validEvent, title: "  " }] };
    expect(portableTripSchema.safeParse(bad).success).toBe(false);
  });

  it("rejette une métadonnée imbriquée (non plate)", () => {
    const bad = { ...validTrip, events: [{ ...validEvent, metadata: { nested: { a: 1 } } }] };
    expect(portableTripSchema.safeParse(bad).success).toBe(false);
  });
});
