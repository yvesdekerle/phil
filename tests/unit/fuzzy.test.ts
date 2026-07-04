import { describe, expect, it } from "vitest";
import { fuzzyMatch, normalize } from "@/lib/search/fuzzy";

/** Recherche tolérante (PHIL-Q22) — accents ignorés, petites fautes admises. */
describe("normalize", () => {
  it("supprime accents et casse", () => {
    expect(normalize("Plongée SOUS-marine")).toBe("plongee sous-marine");
  });
});

describe("fuzzyMatch", () => {
  const title = "Plongée sous-marine à l'Île Ronde";

  it("trouve le mot exact", () => {
    expect(fuzzyMatch(title, "plongée")).toBe(true);
  });

  it("ignore les accents", () => {
    expect(fuzzyMatch(title, "plongee")).toBe(true);
  });

  it("tolère une petite faute de frappe", () => {
    expect(fuzzyMatch(title, "plnoge")).toBe(true);
  });

  it("tolère la casse", () => {
    expect(fuzzyMatch(title, "PLONGE")).toBe(true);
  });

  it("rejette un mot sans rapport", () => {
    expect(fuzzyMatch(title, "snowboard")).toBe(false);
  });

  it("une requête vide matche tout", () => {
    expect(fuzzyMatch(title, "")).toBe(true);
  });

  it("exige que chaque mot de la requête corresponde", () => {
    expect(fuzzyMatch(title, "plongée ronde")).toBe(true);
    expect(fuzzyMatch(title, "plongée montagne")).toBe(false);
  });

  it("catamaran retrouvé malgré une lettre manquante", () => {
    expect(fuzzyMatch("Catamaran dauphins", "catamarn")).toBe(true);
  });
});
