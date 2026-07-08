import { describe, expect, it } from "vitest";
import { dragIntensity, dragRotation, dragVerdict, exitOffset } from "@/lib/activities/swipe";

describe("dragVerdict — geste → verdict", () => {
  it("droite franche → YES, gauche franche → NO", () => {
    expect(dragVerdict(120, 0)).toBe("YES");
    expect(dragVerdict(-120, 0)).toBe("NO");
  });

  it("haut → SUPER, bas → MAYBE (axe vertical corrigé vs README Yallah)", () => {
    expect(dragVerdict(0, -120)).toBe("SUPER");
    expect(dragVerdict(0, 120)).toBe("MAYBE");
  });

  it("sous le seuil de déclenchement → null", () => {
    expect(dragVerdict(20, 0)).toBeNull();
    expect(dragVerdict(0, 20)).toBeNull();
    expect(dragVerdict(0, 0)).toBeNull();
  });

  it("privilégie l'horizontale sur les swipes obliques (bias 0.7)", () => {
    // dx grand, dy comparable mais l'horizontale gagne
    expect(dragVerdict(100, 60)).toBe("YES");
    expect(dragVerdict(-100, 60)).toBe("NO");
    // dy nettement dominant → vertical
    expect(dragVerdict(30, -120)).toBe("SUPER");
  });
});

describe("dragRotation — inclinaison de la carte", () => {
  it("nulle au centre, positive à droite, négative à gauche", () => {
    expect(dragRotation(0)).toBe(0);
    expect(dragRotation(45)).toBeGreaterThan(0);
    expect(dragRotation(-45)).toBeLessThan(0);
  });

  it("bornée à ±18° même très loin", () => {
    expect(dragRotation(10000)).toBe(18);
    expect(dragRotation(-10000)).toBe(-18);
  });
});

describe("dragIntensity — 0..1 selon la distance", () => {
  it("0 au centre, 1 au-delà du seuil, borné", () => {
    expect(dragIntensity(0, 0)).toBe(0);
    expect(dragIntensity(90, 0)).toBeCloseTo(1);
    expect(dragIntensity(1000, 1000)).toBe(1);
  });
});

describe("exitOffset — cible hors-écran par verdict", () => {
  it("chaque verdict sort dans la bonne direction", () => {
    expect(exitOffset("YES")).toEqual({ x: 600, y: 0 });
    expect(exitOffset("NO")).toEqual({ x: -600, y: 0 });
    expect(exitOffset("SUPER")).toEqual({ x: 0, y: -600 });
    expect(exitOffset("MAYBE")).toEqual({ x: 0, y: 600 });
  });
});
