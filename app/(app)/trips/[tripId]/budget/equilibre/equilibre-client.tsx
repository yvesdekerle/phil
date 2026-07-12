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
          "rounded-lg px-5 py-4",
          myNet > 0.01
            ? "bg-citron-wash"
            : myNet < -0.01
              ? "bg-lagoon-wash"
              : "border border-line bg-card",
        )}
      >
        <p className="text-heading text-ink">
          {myNet > 0.01
            ? `🤑 ${t("budget.balance.owedToYou")} ${fmt(myNet)}`
            : myNet < -0.01
              ? `${t("budget.balance.youOwe")} ${fmt(-myNet)}`
              : t("budget.balance.settled")}
        </p>
        {nextPayerId ? (
          <p className="mt-1 text-body text-slate">
            {t("budget.balance.nextPayerPrefix")}{" "}
            <span className="font-semibold text-ink">{nameOf(nextPayerId)}</span>{" "}
            {t("budget.balance.nextPayerSuffix")}
          </p>
        ) : null}
      </div>

      {/* Équilibres — rangées aérées par équipier (L3c) */}
      <section className="rounded-lg border border-line bg-card px-4 py-2">
        <h2 className="pt-2 pb-1 text-subhead text-ink">
          {t("budget.balance.balancesTitle")} ({currency})
        </h2>
        <div className="divide-y divide-wash">
          {balances.map((b) => {
            const maxAbs = Math.max(...balances.map((x) => Math.abs(x.net)), 0.01);
            const positive = b.net > 0.01;
            const negative = b.net < -0.01;
            return (
              <div key={b.userId} className="flex items-center gap-3 py-2.5">
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-wash text-caption font-bold text-ink"
                >
                  {nameOf(b.userId).charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body text-ink">{nameOf(b.userId)}</span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-wash">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        positive ? "bg-lagoon" : negative ? "bg-berry" : "bg-wash",
                      )}
                      style={{ width: `${Math.min((Math.abs(b.net) / maxAbs) * 100, 100)}%` }}
                    />
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span
                    className={cn(
                      "block font-mono text-body font-bold tabular-nums",
                      positive ? "text-lagoon-ink" : negative ? "text-berry-ink" : "text-slate",
                    )}
                  >
                    {b.net > 0 ? "+" : ""}
                    {fmt(b.net)}
                  </span>
                  {positive || negative ? (
                    <span className="block font-mono text-label text-mist uppercase">
                      {positive ? t("budget.balance.toReceive") : t("budget.balance.toPay")}
                    </span>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Règlements */}
      {settlements.length > 0 ? (
        <section className="rounded-lg border border-line bg-card px-4 py-2">
          <h2 className="pt-2 pb-1 font-mono text-label text-mist uppercase">
            {t("budget.balance.toSettle")}
          </h2>
          <div className="divide-y divide-wash">
            {settlements.map((s) => (
              <p
                key={`${s.from}-${s.to}`}
                className="flex min-h-11 flex-wrap items-center justify-between gap-2 py-1.5 text-body text-ink"
              >
                <span className="flex flex-wrap items-baseline gap-x-1">
                  {nameOf(s.from)} {t("budget.balance.owes")}{" "}
                  <Money
                    amount={s.amount}
                    currency={currency}
                    secondaryAmount={sub(s.amount)}
                    secondaryCurrency={secondaryCurrency}
                    align="start"
                    className="font-mono font-bold tabular-nums"
                  />{" "}
                  {t("budget.balance.to")} {nameOf(s.to)}
                </span>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await markSettled(tripId, s.from, s.to, s.amount, currency);
                      if (!r.ok) {
                        toast.error(r.message ?? t("budget.toast.actionFailed"));
                      }
                    })
                  }
                  title={t("budget.balance.markSettledTitle")}
                >
                  {t("budget.balance.markSettled")}
                </Button>
              </p>
            ))}
          </div>
        </section>
      ) : (
        <p className="text-body text-slate">{t("budget.balance.nothingToSettle")}</p>
      )}

      {/* Clore / rouvrir la Bourse */}
      {isOwner ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-card px-4 py-3">
          {closedAt ? (
            <>
              <p className="min-w-0 flex-1 text-xs text-slate">
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
              <p className="min-w-0 flex-1 text-xs text-slate">{t("budget.close.closeHint")}</p>
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
