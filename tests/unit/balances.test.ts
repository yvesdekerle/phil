import { describe, expect, it } from "vitest";
import {
  beneficiaryShares,
  computeBalances,
  computeSettlements,
  type ExpenseForBalance,
} from "@/lib/budget/balances";

/**
 * La logique d'argent de la Bourse (PHIL-N09 / PHIL-Q21) — c'est là que les
 * bugs coûtent le plus cher ("qui doit quoi à qui"). Division également / en
 * parts / montants exacts, soldes et règlements simplifiés.
 */
describe("beneficiaryShares", () => {
  it("répartit également par défaut", () => {
    const e: ExpenseForBalance = {
      amount: 90,
      currency: "EUR",
      paid_by: "A",
      beneficiaries: [
        { userId: "A", share: null },
        { userId: "B", share: null },
        { userId: "C", share: null },
      ],
    };
    expect(beneficiaryShares(e)).toEqual([
      { userId: "A", owed: 30 },
      { userId: "B", owed: 30 },
      { userId: "C", owed: 30 },
    ]);
  });

  it("répartit au prorata des parts (2 parts / 1 part)", () => {
    const e: ExpenseForBalance = {
      amount: 90,
      currency: "EUR",
      paid_by: "A",
      splitMode: "shares",
      beneficiaries: [
        { userId: "B", share: 2 },
        { userId: "C", share: 1 },
      ],
    };
    const shares = beneficiaryShares(e);
    expect(shares.find((s) => s.userId === "B")?.owed).toBeCloseTo(60, 5);
    expect(shares.find((s) => s.userId === "C")?.owed).toBeCloseTo(30, 5);
  });

  it("respecte les montants exacts", () => {
    const e: ExpenseForBalance = {
      amount: 100,
      currency: "EUR",
      paid_by: "A",
      splitMode: "exact",
      beneficiaries: [
        { userId: "B", share: 70 },
        { userId: "C", share: 30 },
      ],
    };
    expect(beneficiaryShares(e)).toEqual([
      { userId: "B", owed: 70 },
      { userId: "C", owed: 30 },
    ]);
  });
});

describe("computeBalances", () => {
  it("le payeur est créditeur du total, chaque bénéficiaire débiteur de sa part", () => {
    const balances = computeBalances(
      [
        {
          amount: 90,
          currency: "EUR",
          paid_by: "A",
          beneficiaries: [
            { userId: "A", share: null },
            { userId: "B", share: null },
            { userId: "C", share: null },
          ],
        },
      ],
      "EUR",
    );
    const net = (id: string) => balances.find((b) => b.userId === id)?.net ?? 0;
    expect(net("A")).toBeCloseTo(60, 5); // paie 90, doit 30
    expect(net("B")).toBeCloseTo(-30, 5);
    expect(net("C")).toBeCloseTo(-30, 5);
    // somme des soldes = 0 (les comptes s'équilibrent)
    expect(balances.reduce((s, b) => s + b.net, 0)).toBeCloseTo(0, 5);
  });

  it("ignore les dépenses d'une autre devise", () => {
    const balances = computeBalances(
      [
        {
          amount: 50,
          currency: "MUR",
          paid_by: "A",
          beneficiaries: [{ userId: "B", share: null }],
        },
      ],
      "EUR",
    );
    expect(balances).toHaveLength(0);
  });

  it("un remboursement (payeur=débiteur, bénéficiaire=créancier) remet les soldes à zéro", () => {
    const expenses: ExpenseForBalance[] = [
      // B a avancé 30 pour A
      { amount: 30, currency: "EUR", paid_by: "B", beneficiaries: [{ userId: "A", share: null }] },
      // A rembourse B : réglé comme une dépense où A paie et B en bénéficie
      { amount: 30, currency: "EUR", paid_by: "A", beneficiaries: [{ userId: "B", share: null }] },
    ];
    const balances = computeBalances(expenses, "EUR");
    for (const b of balances) {
      expect(b.net).toBeCloseTo(0, 5);
    }
  });
});

describe("computeSettlements", () => {
  it("propose au débiteur de rembourser le créancier", () => {
    const balances = computeBalances(
      [
        {
          amount: 90,
          currency: "EUR",
          paid_by: "A",
          beneficiaries: [
            { userId: "A", share: null },
            { userId: "B", share: null },
            { userId: "C", share: null },
          ],
        },
      ],
      "EUR",
    );
    const settlements = computeSettlements(balances);
    // B et C doivent chacun 30 à A
    expect(settlements).toHaveLength(2);
    for (const s of settlements) {
      expect(s.to).toBe("A");
      expect(s.amount).toBeCloseTo(30, 5);
    }
    expect(settlements.map((s) => s.from).sort()).toEqual(["B", "C"]);
  });

  it("rien à régler quand tout le monde est à l'équilibre", () => {
    expect(computeSettlements([{ userId: "A", paid: 0, owed: 0, net: 0 }])).toEqual([]);
  });
});
