import { describe, expect, it } from "vitest";
import { beneficiaryCollisions, type Participant, pickTripSuccessor } from "@/lib/account/reassign";

/** Fabrique un participant trié (les tests passent des listes joined_at asc). */
function p(user_id: string, role: string, joined_at: string): Participant {
  return { user_id, role, joined_at };
}

describe("pickTripSuccessor — reprise d'un voyage quand l'OWNER part", () => {
  it("aucun autre participant → personne à promouvoir", () => {
    expect(pickTripSuccessor([])).toBeNull();
  });

  it("un autre OWNER existe déjà → personne à promouvoir", () => {
    const others = [
      p("editor", "EDITOR", "2026-01-01T00:00:00Z"),
      p("coowner", "OWNER", "2026-02-01T00:00:00Z"),
    ];
    expect(pickTripSuccessor(others)).toBeNull();
  });

  it("promeut le plus ancien EDITOR (liste triée par ancienneté)", () => {
    const others = [
      p("viewer", "VIEWER", "2026-01-01T00:00:00Z"),
      p("editor-vieux", "EDITOR", "2026-02-01T00:00:00Z"),
      p("editor-recent", "EDITOR", "2026-03-01T00:00:00Z"),
    ];
    expect(pickTripSuccessor(others)).toBe("editor-vieux");
  });

  it("préfère un EDITOR même s'il a rejoint après un VIEWER plus ancien", () => {
    const others = [
      p("viewer-ancien", "VIEWER", "2026-01-01T00:00:00Z"),
      p("editor", "EDITOR", "2026-06-01T00:00:00Z"),
    ];
    expect(pickTripSuccessor(others)).toBe("editor");
  });

  it("sans aucun EDITOR, promeut le plus ancien participant", () => {
    const others = [
      p("viewer-ancien", "VIEWER", "2026-01-01T00:00:00Z"),
      p("viewer-recent", "VIEWER", "2026-05-01T00:00:00Z"),
    ];
    expect(pickTripSuccessor(others)).toBe("viewer-ancien");
  });
});

describe("beneficiaryCollisions — bénéficiaires en double avant réattribution", () => {
  it("retourne l'intersection (dépenses dont partant ET fantôme bénéficient)", () => {
    expect(beneficiaryCollisions(["a", "b", "c"], ["b", "c", "d"])).toEqual(["b", "c"]);
  });

  it("aucune collision → tableau vide", () => {
    expect(beneficiaryCollisions(["a", "b"], ["x", "y"])).toEqual([]);
  });

  it("côté partant vide → tableau vide", () => {
    expect(beneficiaryCollisions([], ["a", "b"])).toEqual([]);
  });

  it("fonctionne avec des identifiants numériques", () => {
    expect(beneficiaryCollisions([1, 2, 3], [3, 4])).toEqual([3]);
  });

  it("préserve l'ordre de la liste du partant", () => {
    expect(beneficiaryCollisions(["c", "a", "b"], ["a", "b", "c"])).toEqual(["c", "a", "b"]);
  });
});
