"use client";

import { Lock, LockOpen } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Money } from "@/components/budget/money";
import { useLocale, useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import type { Balance, Settlement } from "@/lib/budget/balances";
import { intlLocale } from "@/lib/i18n/dates";
import { cn } from "@/lib/utils";
import { markSettled, setPurseClosed } from "../actions";

type Member = { userId: string; name: string };

/** La Bourse — Équilibre (PHIL-Q21) : soldes façon Tricount. */
export function EquilibreClient({
  tripId,
  balances,
  settlements,
  nextPayerId,
  currency,
  secondaryCurrency,
  secondaryRate,
  members,
  myId,
  isOwner,
  closedAt,
}: {
  tripId: string;
  balances: Balance[];
  settlements: Settlement[];
  nextPayerId: string | null;
  currency: string;
  secondaryCurrency: string | null;
  secondaryRate: number | null;
  members: Member[];
  myId: string;
  isOwner: boolean;
  closedAt: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const t = useT();
  const il = intlLocale(useLocale());
  const nameOf = (id: string) =>
    id === myId
      ? t("budget.common.you")
      : (members.find((m) => m.userId === id)?.name ?? t("budget.common.traveler"));
  const fmt = (n: number) =>
    `${n.toLocaleString(il, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  const sub = (n: number) => (secondaryCurrency && secondaryRate ? n * secondaryRate : null);

  const mine = balances.find((b) => b.userId === myId);
  const myNet = mine?.net ?? 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Mon solde, façon "On te doit X €" */}
      <div
        className={cn(
          "rounded-lg border px-5 py-4",
          myNet > 0.01
            ? "border-laiton bg-laiton/10"
            : myNet < -0.01
              ? "border-bordeaux/40 bg-bordeaux/5"
              : "border-laiton-clair bg-papier",
        )}
      >
        <p className="font-display text-xl text-encre">
          {myNet > 0.01
            ? `🤑 ${t("budget.balance.owedToYou")} ${fmt(myNet)}`
            : myNet < -0.01
              ? `${t("budget.balance.youOwe")} ${fmt(-myNet)}`
              : t("budget.balance.settled")}
        </p>
        {nextPayerId ? (
          <p className="mt-1 text-sm text-encre-douce">
            {t("budget.balance.nextPayerPrefix")}{" "}
            <span className="font-medium text-encre">{nameOf(nextPayerId)}</span>{" "}
            {t("budget.balance.nextPayerSuffix")}
          </p>
        ) : null}
      </div>

      {/* Équilibres */}
      <section className="rounded-lg border border-laiton-clair bg-papier px-4 py-3">
        <h2 className="mb-2 text-sm font-medium text-encre">
          {t("budget.balance.balancesTitle")} ({currency})
        </h2>
        <div className="flex flex-col gap-1">
          {balances.map((b) => (
            <p key={b.userId} className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-encre">{nameOf(b.userId)}</span>
              <span
                className={cn(
                  "font-medium tabular-nums",
                  b.net > 0.01 ? "text-vert" : b.net < -0.01 ? "text-bordeaux" : "text-encre-douce",
                )}
              >
                {b.net > 0 ? "+" : ""}
                {fmt(b.net)}
              </span>
            </p>
          ))}
        </div>
      </section>

      {/* Règlements */}
      {settlements.length > 0 ? (
        <section className="rounded-lg border border-laiton-clair bg-papier px-4 py-3">
          <h2 className="mb-2 text-xs font-medium text-laiton uppercase">
            {t("budget.balance.toSettle")}
          </h2>
          {settlements.map((s) => (
            <p
              key={`${s.from}-${s.to}`}
              className="flex flex-wrap items-center justify-between gap-2 py-1 text-sm text-encre"
            >
              <span className="flex flex-wrap items-baseline gap-x-1">
                {nameOf(s.from)} {t("budget.balance.owes")}{" "}
                <Money
                  amount={s.amount}
                  currency={currency}
                  secondaryAmount={sub(s.amount)}
                  secondaryCurrency={secondaryCurrency}
                  align="start"
                  className="font-medium"
                />{" "}
                {t("budget.balance.to")} {nameOf(s.to)}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await markSettled(tripId, s.from, s.to, s.amount, currency);
                    if (!r.ok) {
                      toast.error(r.message ?? t("budget.toast.actionFailed"));
                    }
                  })
                }
                className="shrink-0 rounded-full border border-laiton-clair px-2.5 py-0.5 text-xs text-encre-douce transition-colors hover:border-bordeaux hover:text-bordeaux"
                title={t("budget.balance.markSettledTitle")}
              >
                {t("budget.balance.markSettled")}
              </button>
            </p>
          ))}
        </section>
      ) : (
        <p className="text-sm text-encre-douce">{t("budget.balance.nothingToSettle")}</p>
      )}

      {/* Clore / rouvrir la Bourse */}
      {isOwner ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-laiton-clair bg-papier px-4 py-3">
          {closedAt ? (
            <>
              <p className="min-w-0 flex-1 text-xs text-encre-douce">
                {t("budget.close.closedOnPrefix")}{" "}
                {new Intl.DateTimeFormat(il, { dateStyle: "long" }).format(new Date(closedAt))}
                {t("budget.close.closedOnSuffix")}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await setPurseClosed(tripId, false);
                    if (!r.ok) {
                      toast.error(r.message ?? t("budget.toast.actionFailed"));
                    }
                  })
                }
              >
                <LockOpen aria-hidden="true" /> {t("budget.close.reopen")}
              </Button>
            </>
          ) : (
            <>
              <p className="min-w-0 flex-1 text-xs text-encre-douce">
                {t("budget.close.closeHint")}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await setPurseClosed(tripId, true);
                    if (!r.ok) {
                      toast.error(r.message ?? t("budget.toast.actionFailed"));
                    }
                  })
                }
              >
                <Lock aria-hidden="true" /> {t("budget.close.close")}
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
