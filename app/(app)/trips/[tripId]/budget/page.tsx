import { redirect } from "next/navigation";
import { computeBalances, computeSettlements } from "@/lib/budget/balances";
import { createClient } from "@/lib/supabase/server";
import { BudgetClient, type ExpenseRow } from "./budget-client";

/** Budget partagé du voyage (PHIL-N09). */
export default async function BudgetPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: expensesData }, { data: members }, { data: me }, { data: events }] =
    await Promise.all([
      supabase
        .from("expenses")
        .select(
          "id, title, amount, currency, paid_by, created_by, category, event_id, spent_on, expense_beneficiaries(user_id)",
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
    ]);

  const expenses: ExpenseRow[] = (expensesData ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    amount: Number(e.amount),
    currency: e.currency,
    paid_by: e.paid_by,
    created_by: e.created_by,
    category: e.category,
    beneficiaries: (e.expense_beneficiaries ?? []).map((b) => b.user_id),
  }));

  const currencies = [...new Set(expenses.map((e) => e.currency))];
  const balancesByCurrency = currencies.map((currency) => {
    const balances = computeBalances(expenses, currency);
    return {
      currency,
      total: expenses.filter((e) => e.currency === currency).reduce((sum, e) => sum + e.amount, 0),
      balances,
      settlements: computeSettlements(balances),
    };
  });

  return (
    <BudgetClient
      tripId={tripId}
      expenses={expenses}
      balancesByCurrency={balancesByCurrency}
      members={(members ?? []).map((m) => ({
        userId: m.user_id,
        name: m.profiles?.display_name ?? "Voyageur",
      }))}
      events={events ?? []}
      myId={user.id}
      isOwner={me?.role === "OWNER"}
    />
  );
}
