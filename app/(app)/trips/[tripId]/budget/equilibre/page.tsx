import { redirect } from "next/navigation";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { computeBalances, computeSettlements } from "@/lib/budget/balances";
import { fromBase, getRates, toBase } from "@/lib/budget/rates";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { PurseNav } from "../purse-nav";
import { EquilibreClient } from "./equilibre-client";

/** La Bourse — Équilibre (PHIL-Q21) : qui doit quoi à qui. */
export default async function PurseBalancePage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const t = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: expensesData }, { data: members }, { data: me }, { data: trip }] =
    await Promise.all([
      supabase
        .from("expenses")
        .select(
          "amount, currency, paid_by, is_settlement, split_mode, expense_beneficiaries(user_id, share)",
        )
        .eq("trip_id", tripId),
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
        .from("trips")
        .select("currency_primary, currency_secondary, purse_closed_at")
        .eq("id", tripId)
        .single(),
    ]);

  const primary = trip?.currency_primary ?? "EUR";
  const secondary = trip?.currency_secondary ?? null;
  const rates = await getRates(primary);
  const secondaryRate = secondary && rates ? fromBase(1, secondary, rates) : null;

  const forBalance = (expensesData ?? []).map((e) => {
    const raw = Number(e.amount);
    const amount =
      e.currency === primary ? raw : rates ? (toBase(raw, e.currency, rates) ?? raw) : raw;
    const convertible =
      e.currency === primary || (rates && toBase(raw, e.currency, rates) !== null);
    return {
      amount,
      currency: convertible ? primary : e.currency,
      paid_by: e.paid_by,
      splitMode: e.split_mode as "equal" | "shares" | "exact",
      beneficiaries: (e.expense_beneficiaries ?? []).map((b) => ({
        userId: b.user_id,
        share: b.share === null ? null : Number(b.share),
      })),
    };
  });

  const balances = computeBalances(forBalance, primary);
  const settlements = computeSettlements(balances);
  // Prochaine dépense : le plus gros débiteur (façon Tricount)
  const nextPayer = balances.length > 0 ? balances[balances.length - 1] : null;

  return (
    <div className="flex flex-col gap-5">
      <RealtimeRefresh tables={["expenses", "expense_beneficiaries"]} />
      <PurseNav tripId={tripId} active="equilibre" closed={Boolean(trip?.purse_closed_at)} />
      <EquilibreClient
        tripId={tripId}
        balances={balances}
        settlements={settlements}
        nextPayerId={nextPayer && nextPayer.net < -0.01 ? nextPayer.userId : null}
        currency={primary}
        secondaryCurrency={secondary}
        secondaryRate={secondaryRate}
        members={(members ?? [])
          .map((m) => ({
            userId: m.user_id,
            name: m.profiles?.display_name ?? t("budget.common.traveler"),
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "fr"))}
        myId={user.id}
        isOwner={me?.role === "OWNER"}
        closedAt={trip?.purse_closed_at ?? null}
      />
    </div>
  );
}
