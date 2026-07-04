import { redirect } from "next/navigation";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { computeBalances, computeSettlements } from "@/lib/budget/balances";
import { fromBase, getRates, toBase } from "@/lib/budget/rates";
import { createClient } from "@/lib/supabase/server";
import { BudgetClient, type ExpenseRow } from "./budget-client";

/** Budget partagé du voyage (PHIL-N09, devises PHIL-P01). */
export default async function BudgetPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [
    { data: expensesData },
    { data: members },
    { data: me },
    { data: events },
    { data: trip },
  ] = await Promise.all([
    supabase
      .from("expenses")
      .select(
        "id, title, amount, currency, paid_by, created_by, category, event_id, spent_on, is_settlement, expense_beneficiaries(user_id)",
      )
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false }),
    supabase
      .from("trip_participants")
      .select("user_id, profiles!trip_participants_user_id_fkey(display_name)")
      .eq("trip_id", tripId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("trip_participants")
      .select("role")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("trip_events")
      .select("id, title, type")
      .eq("trip_id", tripId)
      .order("starts_at", { ascending: true }),
    supabase.from("trips").select("currency_primary, currency_secondary").eq("id", tripId).single(),
  ]);

  // PHIL-P01 : conversion vers la devise principale du voyage
  const primary = trip?.currency_primary ?? "EUR";
  const secondary = trip?.currency_secondary ?? null;
  const rates = await getRates(primary);
  const secondaryRate = secondary && rates ? fromBase(1, secondary, rates) : null;

  const expenses: ExpenseRow[] = (expensesData ?? []).map((e) => {
    const amount = Number(e.amount);
    const amountPrimary =
      e.currency === primary ? amount : rates ? toBase(amount, e.currency, rates) : null;
    return {
      id: e.id,
      title: e.title,
      amount,
      currency: e.currency,
      amountPrimary,
      paid_by: e.paid_by,
      created_by: e.created_by,
      category: e.category,
      spentOn: e.spent_on,
      isSettlement: e.is_settlement,
      beneficiaries: (e.expense_beneficiaries ?? []).map((b) => b.user_id),
    };
  });

  // Groupe principal : toutes les dépenses convertibles, soldes en devise principale
  const convertible = expenses.filter((e) => e.amountPrimary !== null);
  const leftover = expenses.filter((e) => e.amountPrimary === null);

  const groups: {
    currency: string;
    converted: boolean;
    total: number;
    balances: ReturnType<typeof computeBalances>;
    settlements: ReturnType<typeof computeSettlements>;
  }[] = [];

  if (convertible.length > 0) {
    const balances = computeBalances(
      convertible.map((e) => ({
        amount: e.amountPrimary as number,
        currency: primary,
        paid_by: e.paid_by,
        beneficiaries: e.beneficiaries,
      })),
      primary,
    );
    groups.push({
      currency: primary,
      converted: convertible.some((e) => e.currency !== primary),
      total: convertible
        .filter((e) => !e.isSettlement)
        .reduce((sum, e) => sum + (e.amountPrimary as number), 0),
      balances,
      settlements: computeSettlements(balances),
    });
  }
  // Devises sans taux connu : sections séparées comme avant
  for (const currency of [...new Set(leftover.map((e) => e.currency))]) {
    const balances = computeBalances(leftover, currency);
    groups.push({
      currency,
      converted: false,
      total: leftover
        .filter((e) => e.currency === currency && !e.isSettlement)
        .reduce((sum, e) => sum + e.amount, 0),
      balances,
      settlements: computeSettlements(balances),
    });
  }

  return (
    <>
      {/* PHIL-Q03 : dépenses et remboursements en direct */}
      <RealtimeRefresh tables={["expenses", "expense_beneficiaries"]} />
      <BudgetClient
        tripId={tripId}
        expenses={expenses}
        balancesByCurrency={groups}
        primaryCurrency={primary}
        secondaryCurrency={secondary}
        secondaryRate={secondaryRate}
        members={(members ?? []).map((m) => ({
          userId: m.user_id,
          name: m.profiles?.display_name ?? "Voyageur",
        }))}
        events={events ?? []}
        myId={user.id}
        isOwner={me?.role === "OWNER"}
      />
    </>
  );
}
