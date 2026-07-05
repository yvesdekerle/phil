import { describe, expect, it } from "vitest";
import { sortTrips, type Trip, tripStatus } from "@/lib/trips/status";

const trip = (over: Partial<Trip>): Trip =>
  ({
    id: over.id ?? "t",
    start_date: "2026-11-05",
    end_date: "2026-11-21",
    archived_at: null,
    ...over,
  }) as Trip;

const at = (iso: string) => new Date(iso);

describe("tripStatus", () => {
  it("archivé prime sur tout", () => {
    expect(tripStatus(trip({ archived_at: "2026-01-01" }), at("2026-11-10"))).toBe("archive");
  });
  it("à venir avant le départ", () => {
    expect(tripStatus(trip({}), at("2026-10-01"))).toBe("a_venir");
  });
  it("en cours pendant le voyage", () => {
    expect(tripStatus(trip({}), at("2026-11-10"))).toBe("en_cours");
  });
  it("passé après la fin", () => {
    expect(tripStatus(trip({}), at("2026-12-01"))).toBe("passe");
  });
  it("en cours le jour même du départ et de la fin (bornes incluses)", () => {
    expect(tripStatus(trip({}), at("2026-11-05T12:00:00Z"))).toBe("en_cours");
    expect(tripStatus(trip({}), at("2026-11-21T12:00:00Z"))).toBe("en_cours");
  });
});

describe("sortTrips", () => {
  it("ordonne en cours, à venir, passés, archivés", () => {
    // Aujourd'hui réel : le tri s'appuie sur tripStatus(today = now). On teste
    // l'ordre relatif des rangs via des dates très éloignées.
    const past = trip({ id: "past", start_date: "2000-01-01", end_date: "2000-01-10" });
    const future = trip({ id: "future", start_date: "2999-01-01", end_date: "2999-01-10" });
    const archived = trip({ id: "arch", archived_at: "2001-01-01" });
    const ordered = sortTrips([archived, past, future]).map((t) => t.id);
    expect(ordered).toEqual(["future", "past", "arch"]);
  });
});
