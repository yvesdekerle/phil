import { describe, expect, it } from "vitest";
import { asCategory, categoryForEventType } from "@/lib/budget/categories";
import { directionsUrl, navigateUrl } from "@/lib/geo/directions";
import { DEFAULT_PREFERENCES, parsePreferences } from "@/lib/notifications/preferences";
import { checkBearer, timingSafeEqualStr } from "@/lib/security/secret";

describe("catégories de dépense", () => {
  it("mappe le type d'événement", () => {
    expect(categoryForEventType("TRANSPORT")).toBe("transport");
    expect(categoryForEventType("LODGING")).toBe("logement");
    expect(categoryForEventType("ACTIVITY")).toBe("activite");
  });
  it("asCategory retombe sur 'autre' pour l'inconnu/null", () => {
    expect(asCategory("resto")).toBe("resto");
    expect(asCategory("n'importe quoi")).toBe("autre");
    expect(asCategory(null)).toBe("autre");
    expect(asCategory(undefined)).toBe("autre");
  });
});

describe("liens Google Maps", () => {
  it("directionsUrl encode origine et destination (6 décimales)", () => {
    const url = directionsUrl({ lat: -20.35, lng: 57.55 }, { lat: -20.16, lng: 57.5 });
    expect(url).toContain("origin=-20.350000,57.550000");
    expect(url).toContain("destination=-20.160000,57.500000");
    expect(url).toContain("travelmode=driving");
  });
  it("navigateUrl encode une adresse texte", () => {
    expect(navigateUrl("Le Morne, Maurice")).toContain("destination=Le%20Morne%2C%20Maurice");
  });
  it("navigateUrl accepte des coordonnées", () => {
    expect(navigateUrl({ lat: 48.85, lng: 2.35 })).toContain("destination=48.850000,2.350000");
  });
});

describe("parsePreferences", () => {
  it("valeurs invalides → défauts", () => {
    expect(parsePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences("garbage")).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences({})).toEqual(DEFAULT_PREFERENCES);
  });
  it("complète les clés absentes par leur défaut (weather/empty_day)", () => {
    const p = parsePreferences({
      invitations: true,
      expiry_alerts: false,
      event_reminders: true,
    });
    expect(p.expiry_alerts).toBe(false);
    expect(p.weather_alerts).toBe(true);
    expect(p.empty_day_reminders).toBe(true);
  });
});

describe("secrets (temps constant)", () => {
  it("compare correctement", () => {
    expect(timingSafeEqualStr("s3cr3t", "s3cr3t")).toBe(true);
    expect(timingSafeEqualStr("s3cr3t", "wrong")).toBe(false);
    expect(timingSafeEqualStr("a", "ab")).toBe(false);
  });
  it("checkBearer valide l'en-tête Authorization", () => {
    const req = (h: Record<string, string>) => new Request("http://x", { headers: h });
    expect(checkBearer(req({ authorization: "Bearer top" }), "top")).toBe(true);
    expect(checkBearer(req({ authorization: "Bearer nope" }), "top")).toBe(false);
    expect(checkBearer(req({}), "top")).toBe(false);
    // fail-closed si le secret d'env est absent
    expect(checkBearer(req({ authorization: "Bearer top" }), undefined)).toBe(false);
  });
});
