/** Calcul des soldes et règlements simplifiés (PHIL-N09, modes de division PHIL-Q21). */

export type BeneficiaryShare = {
  userId: string;
  /** Parts (shares) ou montant exact (exact) — null en division égale. */
  share: number | null;
};

export type ExpenseForBalance = {
  amount: number;
  currency: string;
  paid_by: string;
  splitMode?: "equal" | "shares" | "exact";
  beneficiaries: BeneficiaryShare[];
};

export type Balance = { userId: string; paid: number; owed: number; net: number };
export type Settlement = { from: string; to: string; amount: number };

/** Part de chaque bénéficiaire selon le mode de division. */
export function beneficiaryShares(e: ExpenseForBalance): { userId: string; owed: number }[] {
  const mode = e.splitMode ?? "equal";
  if (mode === "exact") {
    return e.beneficiaries.map((b) => ({ userId: b.userId, owed: b.share ?? 0 }));
  }
  if (mode === "shares") {
    const total = e.beneficiaries.reduce((s, b) => s + (b.share ?? 1), 0);
    return e.beneficiaries.map((b) => ({
      userId: b.userId,
      owed: total > 0 ? (e.amount * (b.share ?? 1)) / total : 0,
    }));
  }
  return e.beneficiaries.map((b) => ({
    userId: b.userId,
    owed: e.amount / e.beneficiaries.length,
  }));
}

/** Soldes par personne pour une devise donnée. */
export function computeBalances(expenses: ExpenseForBalance[], currency: string): Balance[] {
  const map = new Map<string, { paid: number; owed: number }>();
  const get = (id: string) => {
    if (!map.has(id)) {
      map.set(id, { paid: 0, owed: 0 });
    }
    return map.get(id) as { paid: number; owed: number };
  };
  for (const e of expenses.filter((e) => e.currency === currency && e.beneficiaries.length > 0)) {
    get(e.paid_by).paid += e.amount;
    for (const { userId, owed } of beneficiaryShares(e)) {
      get(userId).owed += owed;
    }
  }
  return [...map.entries()]
    .map(([userId, v]) => ({ userId, paid: v.paid, owed: v.owed, net: v.paid - v.owed }))
    .sort((a, b) => b.net - a.net);
}

/** Règlements simplifiés (glouton : plus gros créancier ← plus gros débiteur). */
export function computeSettlements(balances: Balance[]): Settlement[] {
  const creditors = balances.filter((b) => b.net > 0.005).map((b) => ({ ...b }));
  const debtors = balances.filter((b) => b.net < -0.005).map((b) => ({ ...b, net: -b.net }));
  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < creditors.length && j < debtors.length) {
    const amount = Math.min(creditors[i].net, debtors[j].net);
    settlements.push({ from: debtors[j].userId, to: creditors[i].userId, amount });
    creditors[i].net -= amount;
    debtors[j].net -= amount;
    if (creditors[i].net < 0.005) {
      i++;
    }
    if (debtors[j].net < 0.005) {
      j++;
    }
  }
  return settlements;
}
