import { redirect } from "next/navigation";
import { beneficiaryShares } from "@/lib/budget/balances";
import { asCategory, EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/budget/categories";
import { getRates, toBase } from "@/lib/budget/rates";
import { getIntlLocale, getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { PurseNav } from "../purse-nav";

type Slice = { label: string; amount: number };

function fmt(n: number, c: string, il: string): string {
  return `${n.toLocaleString(il, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c}`;
}

async function Bars({
  slices,
  total,
  currency,
  tone = "lagoon",
}: {
  slices: Slice[];
  total: number;
  currency: string;
  /** L3a : catégories en lagune, phases (avant/pendant) en encre. */
  tone?: "lagoon" | "ink";
}) {
  const t = await getT();
  const il = await getIntlLocale();
  if (slices.every((s) => s.amount === 0)) {
    return <p className="text-body text-slate">{t("budget.tracking.nothingYet")}</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {slices.map((s) => (
        <div
          key={s.label}
          className={cn("flex items-center gap-2.5", s.amount === 0 && "opacity-55")}
        >
          <span className="w-24 shrink-0 truncate text-ui text-ink">{s.label}</span>
          <div className="h-[9px] flex-1 overflow-hidden rounded-[5px] bg-lagoon-wash">
            <div
              className={cn("h-full rounded-[5px]", tone === "ink" ? "bg-ink" : "bg-lagoon")}
              style={{
                width: `${total > 0 && s.amount > 0 ? Math.max((s.amount / total) * 100, 2) : 0}%`,
              }}
            />
          </div>
          <span className="w-28 shrink-0 text-right font-mono text-caption font-bold text-ink tabular-nums">
            {fmt(s.amount, currency, il)}
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
  const t = await getT();
  const il = await getIntlLocale();
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

  const phaseLabel: Record<"avant" | "pendant" | "après", string> = {
    avant: t("budget.tracking.before"),
    pendant: t("budget.tracking.during"),
    après: t("budget.tracking.after"),
  };

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
        <p className="rounded-lg border border-dashed border-line bg-card/60 px-4 py-10 text-center text-sm text-slate">
          {t("budget.tracking.empty")}
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
              label: t(`budget.categories.${c}`),
              amount: inCurrency.filter((e) => e.category === c).reduce((s, e) => s + getter(e), 0),
            }));

          const byPhase = (getter: (e: (typeof inCurrency)[number]) => number): Slice[] =>
            (["avant", "pendant", "après"] as const).map((phase) => ({
              label: phaseLabel[phase],
              amount: inCurrency
                .filter((e) => phaseOf(e.spentOn) === phase)
                .reduce((s, e) => s + getter(e), 0),
            }));

          return (
            <section key={currency} className="flex flex-col gap-4">
              <div className="rounded-lg border border-line bg-card p-4">
                <h2 className="mb-3 flex items-baseline justify-between gap-3">
                  <span className="text-subhead text-ink">
                    {t("budget.tracking.tripTitle")} ({currency})
                  </span>
                  <span className="font-mono text-data text-ink tabular-nums">
                    {fmt(total, currency, il)}
                  </span>
                </h2>
                <Bars slices={byCategory((e) => e.amount)} total={total} currency={currency} />
                <h3 className="mt-4 mb-2 border-t border-wash pt-3 font-mono text-label text-mist uppercase">
                  {t("budget.tracking.phases")}
                </h3>
                <Bars
                  slices={byPhase((e) => e.amount)}
                  total={total}
                  currency={currency}
                  tone="ink"
                />
              </div>

              <div className="rounded-lg border border-line bg-card p-4">
                <h2 className="mb-3 text-subhead text-ink">
                  {t("budget.tracking.myExpenses")} ({currency})
                </h2>
                <div className="mb-4 grid grid-cols-2 gap-2.5">
                  <div className="rounded-lg border border-line bg-sand px-3 py-2.5">
                    <p className="font-mono text-label text-slate uppercase">
                      {t("budget.tracking.myShare")}
                    </p>
                    <p className="mt-0.5 font-mono text-base font-bold text-ink tabular-nums">
                      {fmt(myTotal, currency, il)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-line bg-sand px-3 py-2.5">
                    <p className="font-mono text-label text-slate uppercase">
                      {t("budget.tracking.advanced")}
                    </p>
                    <p className="mt-0.5 font-mono text-base font-bold text-ink tabular-nums">
                      {fmt(myPaid, currency, il)}
                    </p>
                  </div>
                </div>
                <Bars slices={byCategory((e) => e.myShare)} total={myTotal} currency={currency} />
                <h3 className="mt-4 mb-2 border-t border-wash pt-3 font-mono text-label text-mist uppercase">
                  {t("budget.tracking.phases")}
                </h3>
                <Bars
                  slices={byPhase((e) => e.myShare)}
                  total={myTotal}
                  currency={currency}
                  tone="ink"
                />
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
