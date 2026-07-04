/** Calcul des soldes et règlements simplifiés (PHIL-N09). */

export type ExpenseForBalance = {
  amount: number;
  currency: string;
  paid_by: string;
  beneficiaries: string[];
};

export type Balance = { userId: string; paid: number; owed: number; net: number };
export type Settlement = { from: string; to: string; amount: number };

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
    const share = e.amount / e.beneficiaries.length;
    for (const b of e.beneficiaries) {
      get(b).owed += share;
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
