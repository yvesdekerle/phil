import { redirect } from "next/navigation";
import { beneficiaryShares } from "@/lib/budget/balances";
import {
  asCategory,
  CATEGORY_LABELS,
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
} from "@/lib/budget/categories";
import { getRates, toBase } from "@/lib/budget/rates";
import { createClient } from "@/lib/supabase/server";
import { PurseNav } from "../purse-nav";

type Slice = { label: string; amount: number };

function fmt(n: number, c: string): string {
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c}`;
}

function Bars({ slices, total, currency }: { slices: Slice[]; total: number; currency: string }) {
  const visible = slices.filter((s) => s.amount > 0);
  if (visible.length === 0) {
    return <p className="text-sm text-encre-douce">Rien pour l'instant.</p>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      {visible.map((s) => (
        <div key={s.label} className="flex items-center gap-2 text-sm">
          <span className="w-24 shrink-0 text-encre">{s.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-laiton-clair/30">
            <div
              className="h-full rounded-full bg-bordeaux/80"
              style={{ width: `${total > 0 ? Math.max((s.amount / total) * 100, 2) : 0}%` }}
            />
          </div>
          <span className="w-28 shrink-0 text-right text-encre-douce tabular-nums">
            {fmt(s.amount, currency)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Suivi des dépenses par catégorie (PHIL-O09) — le voyage au global et ma part. */
export default async function ExpenseTrackingPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: expensesData }, { data: trip }] = await Promise.all([
    supabase
      .from("expenses")
      .select(
        "amount, currency, category, spent_on, paid_by, split_mode, expense_beneficiaries(user_id, share)",
      )
      .eq("trip_id", tripId)
      .eq("is_settlement", false),
    supabase
      .from("trips")
      .select("start_date, end_date, currency_primary, currency_secondary, purse_closed_at")
      .eq("id", tripId)
      .single(),
  ]);

  // PHIL-P01 : tout est converti vers la devise principale du voyage
  const primary = trip?.currency_primary ?? "EUR";
  const rates = await getRates(primary);

  const expenses = (expensesData ?? []).map((e) => {
    const raw = Number(e.amount);
    const amount =
      e.currency === primary ? raw : rates ? (toBase(raw, e.currency, rates) ?? raw) : raw;
    const converted = e.currency === primary || (rates && toBase(raw, e.currency, rates) !== null);
    // PHIL-Q21 : ma part selon le mode de division (également / parts / exacts)
    const myShare =
      beneficiaryShares({
        amount,
        currency: converted ? primary : e.currency,
        paid_by: e.paid_by,
        splitMode: e.split_mode as "equal" | "shares" | "exact",
        beneficiaries: (e.expense_beneficiaries ?? []).map((b) => ({
          userId: b.user_id,
          share: b.share === null ? null : Number(b.share),
        })),
      }).find((s) => s.userId === user.id)?.owed ?? 0;
    return {
      amount,
      currency: converted ? primary : e.currency,
      category: asCategory(e.category),
      spentOn: e.spent_on,
      paidBy: e.paid_by,
      myShare,
    };
  });

  const currencies = [...new Set(expenses.map((e) => e.currency))];

  const phaseOf = (spentOn: string): "avant" | "pendant" | "après" => {
    if (!trip) {
      return "pendant";
    }
    if (spentOn < trip.start_date) {
      return "avant";
    }
    return spentOn > trip.end_date ? "après" : "pendant";
  };

  return (
    <div className="flex flex-col gap-6">
      <PurseNav tripId={tripId} active="suivi" closed={Boolean(trip?.purse_closed_at)} />

      {expenses.length === 0 ? (
        <p className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-4 py-10 text-center text-sm text-encre-douce">
          Aucune dépense enregistrée — le suivi commencera avec la première.
        </p>
      ) : (
        currencies.map((currency) => {
          const inCurrency = expenses.filter((e) => e.currency === currency);
          const total = inCurrency.reduce((s, e) => s + e.amount, 0);
          const myTotal = inCurrency.reduce((s, e) => s + e.myShare, 0);
          const myPaid = inCurrency
            .filter((e) => e.paidBy === user.id)
            .reduce((s, e) => s + e.amount, 0);

          const byCategory = (getter: (e: (typeof inCurrency)[number]) => number): Slice[] =>
            EXPENSE_CATEGORIES.map((c: ExpenseCategory) => ({
              label: CATEGORY_LABELS[c],
              amount: inCurrency.filter((e) => e.category === c).reduce((s, e) => s + getter(e), 0),
            }));

          const byPhase = (getter: (e: (typeof inCurrency)[number]) => number): Slice[] =>
            (["avant", "pendant", "après"] as const).map((phase) => ({
              label: phase.charAt(0).toUpperCase() + phase.slice(1),
              amount: inCurrency
                .filter((e) => phaseOf(e.spentOn) === phase)
                .reduce((s, e) => s + getter(e), 0),
            }));

          return (
            <section key={currency} className="flex flex-col gap-5">
              <div className="rounded-lg border border-laiton-clair bg-papier px-4 py-3">
                <h2 className="mb-3 flex items-baseline justify-between text-sm font-medium text-encre">
                  <span>Le voyage ({currency})</span>
                  <span className="text-encre-douce">Total : {fmt(total, currency)}</span>
                </h2>
                <Bars slices={byCategory((e) => e.amount)} total={total} currency={currency} />
                <h3 className="mt-4 mb-2 text-xs font-medium text-laiton uppercase tracking-wide">
                  Avant / pendant / après
                </h3>
                <Bars slices={byPhase((e) => e.amount)} total={total} currency={currency} />
              </div>

              <div className="rounded-lg border border-laiton-clair bg-papier px-4 py-3">
                <h2 className="mb-3 flex items-baseline justify-between text-sm font-medium text-encre">
                  <span>Mes dépenses ({currency})</span>
                  <span className="text-encre-douce">
                    Ma part : {fmt(myTotal, currency)} · j'ai avancé {fmt(myPaid, currency)}
                  </span>
                </h2>
                <Bars slices={byCategory((e) => e.myShare)} total={myTotal} currency={currency} />
                <h3 className="mt-4 mb-2 text-xs font-medium text-laiton uppercase tracking-wide">
                  Avant / pendant / après
                </h3>
                <Bars slices={byPhase((e) => e.myShare)} total={myTotal} currency={currency} />
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
