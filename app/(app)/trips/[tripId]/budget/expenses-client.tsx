"use client";

import { format } from "date-fns";
import { Search, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { CurrencyInput } from "@/components/budget/currency-input";
import { Money } from "@/components/budget/money";
import { useLocale, useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  categoryForEventType,
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
} from "@/lib/budget/categories";
import { dateFnsLocale, intlLocale } from "@/lib/i18n/dates";
import { fuzzyMatch } from "@/lib/search/fuzzy";
import { addExpense, deleteExpense, type ExpenseState } from "./actions";

export type ExpenseRow = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  amountPrimary: number | null;
  paid_by: string;
  created_by: string;
  category: string;
  spentOn: string;
  isSettlement: boolean;
  splitMode: "equal" | "shares" | "exact";
  beneficiaries: { userId: string; share: number | null }[];
};
type Member = { userId: string; name: string };
type EventOption = { id: string; title: string; type: "TRANSPORT" | "LODGING" | "ACTIVITY" };
type SplitMode = "equal" | "shares" | "exact";

const SPLIT_MODES: readonly SplitMode[] = ["equal", "shares", "exact"];

/** La Bourse — onglet Dépenses (PHIL-Q21, à la Tricount). */
export function ExpensesClient({
  tripId,
  expenses,
  primaryCurrency,
  secondaryCurrency,
  secondaryRate,
  members,
  events,
  myId,
  isOwner,
  closed,
}: {
  tripId: string;
  expenses: ExpenseRow[];
  primaryCurrency: string;
  secondaryCurrency: string | null;
  secondaryRate: number | null;
  members: Member[];
  events: EventOption[];
  myId: string;
  isOwner: boolean;
  closed: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>("autre");
  const [splitMode, setSplitMode] = useState<"equal" | "shares" | "exact">("equal");
  const [amount, setAmount] = useState<number>(0);
  const [checked, setChecked] = useState<Set<string>>(new Set(members.map((m) => m.userId)));
  const [shares, setShares] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [state, formAction, formPending] = useActionState<ExpenseState, FormData>(addExpense, {
    status: "idle",
  });
  const [pending, startTransition] = useTransition();
  const t = useT();
  const locale = useLocale();
  const dfLocale = dateFnsLocale(locale);
  const il = intlLocale(locale);

  const splitLabels: Record<SplitMode, string> = {
    equal: t("budget.split.equal"),
    shares: t("budget.split.shares"),
    exact: t("budget.split.exact"),
  };

  const nameOf = (id: string) =>
    id === myId
      ? t("budget.common.you")
      : (members.find((m) => m.userId === id)?.name ?? t("budget.common.traveler"));
  const realNameOf = (id: string) =>
    members.find((m) => m.userId === id)?.name ?? t("budget.common.traveler");
  const fmt = (n: number, c: string) =>
    `${n.toLocaleString(il, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c}`;
  const sub = (amountInPrimary: number) =>
    secondaryCurrency && secondaryRate ? amountInPrimary * secondaryRate : null;

  // Aperçu de la part de chacun selon le mode (façon Tricount)
  const shareOf = (userId: string): number => {
    const list = [...checked];
    if (list.length === 0 || !checked.has(userId)) {
      return 0;
    }
    if (splitMode === "exact") {
      return shares[userId] ?? 0;
    }
    if (splitMode === "shares") {
      const total = list.reduce((s, id) => s + (shares[id] ?? 1), 0);
      return total > 0 ? (amount * (shares[userId] ?? 1)) / total : 0;
    }
    return amount / list.length;
  };

  const myTotal = expenses
    .filter((e) => e.paid_by === myId && !e.isSettlement)
    .reduce((s, e) => s + (e.amountPrimary ?? 0), 0);
  const total = expenses
    .filter((e) => !e.isSettlement)
    .reduce((s, e) => s + (e.amountPrimary ?? 0), 0);

  const filtered = query.trim()
    ? expenses.filter((e) => fuzzyMatch(e.title, query) || fuzzyMatch(realNameOf(e.paid_by), query))
    : expenses;

  // Groupement par date, plus récent en premier (façon Tricount)
  const byDate = useMemo(() => {
    const map = new Map<string, ExpenseRow[]>();
    for (const e of filtered) {
      map.set(e.spentOn, [...(map.get(e.spentOn) ?? []), e]);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  function exportCsv() {
    const header = [
      t("budget.csv.date"),
      t("budget.csv.title"),
      t("budget.csv.category"),
      t("budget.csv.amount"),
      t("budget.csv.currency"),
      `${t("budget.csv.amountIn")} (${primaryCurrency})`,
      t("budget.csv.paidBy"),
      t("budget.csv.beneficiaries"),
      t("budget.csv.split"),
      t("budget.csv.settlement"),
    ];
    const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = expenses.map((e) =>
      [
        e.spentOn,
        e.title,
        e.isSettlement ? "" : e.category,
        e.amount.toFixed(2).replace(".", ","),
        e.currency,
        e.amountPrimary !== null ? e.amountPrimary.toFixed(2).replace(".", ",") : "",
        realNameOf(e.paid_by),
        e.beneficiaries.map((b) => realNameOf(b.userId)).join(", "),
        splitLabels[e.splitMode],
        e.isSettlement ? t("budget.csv.yes") : t("budget.csv.no"),
      ]
        .map(cell)
        .join(";"),
    );
    const csv = `﻿${header.map(cell).join(";")}\n${lines.join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = t("budget.csv.filename");
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-laiton-clair bg-papier px-4 py-2.5 text-center">
          <p className="text-xs text-encre-douce">{t("budget.summary.myExpenses")}</p>
          <Money
            amount={myTotal}
            currency={primaryCurrency}
            secondaryAmount={sub(myTotal)}
            secondaryCurrency={secondaryCurrency}
            align="start"
            className="items-center font-display text-lg text-encre"
          />
        </div>
        <div className="rounded-lg border border-laiton-clair bg-papier px-4 py-2.5 text-center">
          <p className="text-xs text-encre-douce">{t("budget.summary.totalExpenses")}</p>
          <Money
            amount={total}
            currency={primaryCurrency}
            secondaryAmount={sub(total)}
            secondaryCurrency={secondaryCurrency}
            align="start"
            className="items-center font-display text-lg text-encre"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search
            className="absolute top-2.5 left-2.5 size-4 text-encre-douce"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("budget.form.searchPlaceholder")}
            className="h-9 pl-8 text-sm"
          />
        </div>
        {expenses.length > 0 ? (
          <Button type="button" variant="outline" onClick={exportCsv}>
            {t("budget.form.csv")}
          </Button>
        ) : null}
        {closed ? null : (
          <Button type="button" onClick={() => setShowForm(!showForm)}>
            {showForm ? t("budget.common.cancel") : t("budget.form.addExpense")}
          </Button>
        )}
      </div>

      {showForm && !closed ? (
        <form
          action={formAction}
          className="flex flex-col gap-3 rounded-lg border border-laiton-clair bg-papier px-4 py-3"
        >
          <input type="hidden" name="tripId" value={tripId} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              name="title"
              placeholder={t("budget.form.titlePlaceholder")}
              required
              maxLength={200}
            />
            <div className="flex gap-2">
              <Input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder={t("budget.form.amountPlaceholder")}
                required
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
              />
              <CurrencyInput
                name="currency"
                defaultValue={primaryCurrency}
                className="w-24"
                aria-label={t("budget.form.currencyAria")}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm text-encre">
              {t("budget.form.category")}
              <select
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="rounded border border-laiton-clair bg-papier px-2 py-1.5 text-sm"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`budget.categories.${c}`)}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1 text-sm text-encre">
              <label htmlFor="spentOn">{t("budget.form.when")}</label>
              <Input
                id="spentOn"
                name="spentOn"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm text-encre">
              {t("budget.form.paidBy")}
              <select
                name="paidBy"
                defaultValue={myId}
                className="rounded border border-laiton-clair bg-papier px-2 py-1.5 text-sm"
              >
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {nameOf(m.userId)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-encre">
              {t("budget.form.linkedEvent")}
              <select
                name="eventId"
                defaultValue=""
                onChange={(e) => {
                  const ev = events.find((x) => x.id === e.target.value);
                  if (ev) {
                    setCategory(categoryForEventType(ev.type));
                  }
                }}
                className="rounded border border-laiton-clair bg-papier px-2 py-1.5 text-sm"
              >
                <option value="">{t("budget.form.none")}</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-encre">
            {t("budget.form.split")}
            <select
              name="splitMode"
              value={splitMode}
              onChange={(e) => setSplitMode(e.target.value as typeof splitMode)}
              className="rounded border border-laiton-clair bg-papier px-2 py-1.5 text-sm"
            >
              {SPLIT_MODES.map((m) => (
                <option key={m} value={m}>
                  {splitLabels[m]}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-sm text-encre">{t("budget.form.forWhom")}</legend>
            {members.map((m) => {
              const isIn = checked.has(m.userId);
              return (
                <div
                  key={m.userId}
                  className="flex items-center gap-2 rounded-md border border-laiton-clair/50 px-2.5 py-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    name="beneficiaries"
                    value={m.userId}
                    checked={isIn}
                    onChange={(e) =>
                      setChecked((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) {
                          next.add(m.userId);
                        } else {
                          next.delete(m.userId);
                        }
                        return next;
                      })
                    }
                    className="accent-bordeaux"
                    aria-label={`${t("budget.form.beneficiaryAria")} ${nameOf(m.userId)}`}
                  />
                  <span className="min-w-0 flex-1 text-encre">{nameOf(m.userId)}</span>
                  {splitMode !== "equal" && isIn ? (
                    <input
                      type="number"
                      name={`share-${m.userId}`}
                      min={0}
                      step={splitMode === "shares" ? 0.5 : 0.01}
                      value={shares[m.userId] ?? (splitMode === "shares" ? 1 : 0)}
                      onChange={(e) =>
                        setShares((prev) => ({ ...prev, [m.userId]: Number(e.target.value) || 0 }))
                      }
                      className="w-20 rounded border border-laiton-clair bg-papier px-1.5 py-0.5 text-right text-xs"
                      aria-label={
                        splitMode === "shares"
                          ? t("budget.form.sharesAria")
                          : t("budget.form.exactAria")
                      }
                    />
                  ) : null}
                  <span className="w-20 shrink-0 text-right text-xs text-encre-douce tabular-nums">
                    {isIn ? fmt(shareOf(m.userId), "") : "—"}
                  </span>
                </div>
              );
            })}
          </fieldset>

          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={formPending}>
              {formPending ? t("budget.form.saving") : t("budget.common.save")}
            </Button>
            {state.status === "error" ? (
              <p className="text-xs text-bordeaux">{state.message}</p>
            ) : null}
          </div>
        </form>
      ) : null}

      {byDate.length === 0 ? (
        <p className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-4 py-8 text-center text-sm text-encre-douce">
          {query ? t("budget.empty.noMatch") : t("budget.empty.noExpenses")}
        </p>
      ) : (
        byDate.map(([date, rows]) => (
          <section key={date}>
            <h2 className="mb-1.5 text-sm font-medium text-encre-douce capitalize">
              {format(new Date(`${date}T12:00:00`), "d MMMM yyyy", { locale: dfLocale })}
            </h2>
            <div className="flex flex-col gap-1.5">
              {rows.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 rounded-md border border-laiton-clair/60 bg-papier px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate text-encre">
                    {e.isSettlement ? "↩ " : ""}
                    {e.title}
                    {e.isSettlement ? (
                      <span className="ml-1.5 rounded-full bg-encre/10 px-2 py-0.5 text-[0.65rem] text-encre-douce">
                        {t("budget.list.betweenTravelers")}
                      </span>
                    ) : (
                      <span className="ml-1.5 rounded-full bg-laiton/15 px-2 py-0.5 text-[0.65rem] text-laiton">
                        {EXPENSE_CATEGORIES.includes(e.category as ExpenseCategory)
                          ? t(`budget.categories.${e.category}`)
                          : e.category}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-encre-douce">
                    {e.isSettlement
                      ? `${nameOf(e.paid_by)} → ${nameOf(e.beneficiaries[0]?.userId ?? "")}`
                      : `${nameOf(e.paid_by)} · ${t("budget.list.for")} ${e.beneficiaries.length}${e.splitMode !== "equal" ? ` (${splitLabels[e.splitMode].toLowerCase()})` : ""}`}
                  </span>
                  <Money
                    amount={e.amountPrimary ?? e.amount}
                    currency={e.amountPrimary !== null ? primaryCurrency : e.currency}
                    secondaryAmount={e.amountPrimary !== null ? sub(e.amountPrimary) : null}
                    secondaryCurrency={secondaryCurrency}
                    className="shrink-0 font-medium text-encre"
                    title={
                      e.currency !== primaryCurrency
                        ? `${t("budget.list.entered")} ${fmt(e.amount, e.currency)}`
                        : undefined
                    }
                  />
                  {(e.created_by === myId || e.paid_by === myId || isOwner) && !closed ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await deleteExpense(tripId, e.id);
                          if (!r.ok) {
                            toast.error(r.message ?? t("budget.toast.deleteFailed"));
                          }
                        })
                      }
                      className="text-encre-douce hover:text-bordeaux"
                      aria-label={`${t("budget.common.delete")} ${e.title}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
