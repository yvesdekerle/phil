import { describe, expect, it } from "vitest";
import { haversineKm } from "@/lib/geo/distance";
import { catalogItemTitle, matchesCatalogItem } from "@/lib/trips/packing-catalog";

/** Distance à vol d'oiseau (PHIL-P09) — sert la carte et l'Explorateur. */
describe("haversineKm", () => {
  it("distance nulle entre un point et lui-même", () => {
    expect(haversineKm({ lat: -20.3, lng: 57.5 }, { lat: -20.3, lng: 57.5 })).toBeCloseTo(0, 5);
  });

  it("Paris → Île Maurice ≈ 9500 km (±150)", () => {
    const km = haversineKm({ lat: 48.8566, lng: 2.3522 }, { lat: -20.3484, lng: 57.5522 });
    expect(km).toBeGreaterThan(9350);
    expect(km).toBeLessThan(9650);
  });

  it("un degré de latitude ≈ 111 km", () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.2, 0);
  });
});

/** Catalogue de la Valise (PHIL-Q10/Q27). */
describe("catalogItemTitle", () => {
  it("ajoute la quantité au-delà de 1", () => {
    expect(catalogItemTitle("T-shirts", 8)).toBe("T-shirts ×8");
  });
  it("n'ajoute rien pour une unité", () => {
    expect(catalogItemTitle("Pyjama", 1)).toBe("Pyjama");
  });
});

describe("matchesCatalogItem", () => {
  it("reconnaît un item avec quantité", () => {
    expect(matchesCatalogItem("T-shirts ×8", "T-shirts")).toBe(true);
  });
  it("insensible aux accents", () => {
    expect(matchesCatalogItem("Crème solaire", "Creme solaire")).toBe(true);
  });
  it("ne confond pas deux items distincts", () => {
    expect(matchesCatalogItem("Chaussettes", "T-shirts")).toBe(false);
  });
});
