import { describe, expect, it } from "vitest";
import { fromBase, type Rates, toBase } from "@/lib/budget/rates";

/** Conversion multi-devises de la Bourse (PHIL-P01). */
const rates: Rates = { base: "EUR", rates: { EUR: 1, MUR: 50, USD: 1.1 } };

describe("toBase", () => {
  it("laisse inchangé un montant déjà en devise de base", () => {
    expect(toBase(100, "EUR", rates)).toBe(100);
  });
  it("convertit vers la base (8400 MUR ÷ 50 = 168 EUR)", () => {
    expect(toBase(8400, "MUR", rates)).toBeCloseTo(168, 5);
  });
  it("renvoie null pour une devise inconnue", () => {
    expect(toBase(100, "JPY", rates)).toBeNull();
  });
});

describe("fromBase", () => {
  it("laisse inchangé vers la devise de base", () => {
    expect(fromBase(100, "EUR", rates)).toBe(100);
  });
  it("convertit depuis la base (168 EUR × 50 = 8400 MUR)", () => {
    expect(fromBase(168, "MUR", rates)).toBeCloseTo(8400, 5);
  });
  it("renvoie null pour une devise inconnue", () => {
    expect(fromBase(100, "JPY", rates)).toBeNull();
  });
});

describe("toBase ∘ fromBase", () => {
  it("est un aller-retour neutre", () => {
    const back = toBase(fromBase(250, "USD", rates) as number, "USD", rates);
    expect(back).toBeCloseTo(250, 5);
  });
});
