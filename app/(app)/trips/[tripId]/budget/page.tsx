import { redirect } from "next/navigation";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { fromBase, getRates, toBase } from "@/lib/budget/rates";
import { createClient } from "@/lib/supabase/server";
import { type ExpenseRow, ExpensesClient } from "./expenses-client";
import { PurseNav } from "./purse-nav";

/** La Bourse — Dépenses (PHIL-Q21). Bourse close → on atterrit sur l'Équilibre. */
export default async function PurseExpensesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tripId } = await params;
  const { tab } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("currency_primary, currency_secondary, purse_closed_at")
    .eq("id", tripId)
    .single();
  const closed = Boolean(trip?.purse_closed_at);
  // Close, la Bourse s'ouvre sur "qui doit quoi à qui" (sauf visite explicite des dépenses)
  if (closed && tab !== "depenses") {
    redirect(`/trips/${tripId}/budget/equilibre`);
  }

  const [{ data: expensesData }, { data: members }, { data: me }, { data: events }] =
    await Promise.all([
      supabase
        .from("expenses")
        .select(
          "id, title, amount, currency, paid_by, created_by, category, event_id, spent_on, is_settlement, split_mode, expense_beneficiaries(user_id, share)",
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

  const primary = trip?.currency_primary ?? "EUR";
  const secondary = trip?.currency_secondary ?? null;
  const rates = await getRates(primary);
  const secondaryRate = secondary && rates ? fromBase(1, secondary, rates) : null;

  const expenses: ExpenseRow[] = (expensesData ?? []).map((e) => {
    const amount = Number(e.amount);
    return {
      id: e.id,
      title: e.title,
      amount,
      currency: e.currency,
      amountPrimary:
        e.currency === primary ? amount : rates ? toBase(amount, e.currency, rates) : null,
      paid_by: e.paid_by,
      created_by: e.created_by,
      category: e.category,
      spentOn: e.spent_on,
      isSettlement: e.is_settlement,
      splitMode: e.split_mode as ExpenseRow["splitMode"],
      beneficiaries: (e.expense_beneficiaries ?? []).map((b) => ({
        userId: b.user_id,
        share: b.share === null ? null : Number(b.share),
      })),
    };
  });

  return (
    <div className="flex flex-col gap-5">
      <RealtimeRefresh tables={["expenses", "expense_beneficiaries"]} />
      <PurseNav tripId={tripId} active="depenses" closed={closed} />
      <ExpensesClient
        tripId={tripId}
        expenses={expenses}
        primaryCurrency={primary}
        secondaryCurrency={secondary}
        secondaryRate={secondaryRate}
        members={(members ?? [])
          .map((m) => ({
            userId: m.user_id,
            name: m.profiles?.display_name ?? "Voyageur",
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "fr"))}
        events={events ?? []}
        myId={user.id}
        isOwner={me?.role === "OWNER"}
        closed={closed}
      />
    </div>
  );
}
