"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Balance, Settlement } from "@/lib/budget/balances";
import {
  CATEGORY_LABELS,
  categoryForEventType,
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
} from "@/lib/budget/categories";
import { addExpense, deleteExpense, type ExpenseState, markSettled } from "./actions";

export type ExpenseRow = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  paid_by: string;
  created_by: string;
  category: string;
  isSettlement: boolean;
  beneficiaries: string[];
};
type Member = { userId: string; name: string };
type EventOption = { id: string; title: string; type: "TRANSPORT" | "LODGING" | "ACTIVITY" };

/** Budget partagé (PHIL-N09) : dépenses, soldes, règlements. */
export function BudgetClient({
  tripId,
  expenses,
  balancesByCurrency,
  members,
  events,
  myId,
  isOwner,
}: {
  tripId: string;
  expenses: ExpenseRow[];
  balancesByCurrency: {
    currency: string;
    total: number;
    balances: Balance[];
    settlements: Settlement[];
  }[];
  members: Member[];
  events: EventOption[];
  myId: string;
  isOwner: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>("autre");
  const [state, formAction, formPending] = useActionState<ExpenseState, FormData>(addExpense, {
    status: "idle",
  });
  const [pending, startTransition] = useTransition();
  const nameOf = (id: string) =>
    id === myId ? "Toi" : (members.find((m) => m.userId === id)?.name ?? "Voyageur");
  const fmt = (n: number, c: string) =>
    `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c}`;

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex gap-1 text-sm" aria-label="Vues du budget">
        <span className="rounded-full bg-bordeaux px-3 py-1 font-medium text-papier">
          Équilibre
        </span>
        <Link
          href={`/trips/${tripId}/budget/depenses`}
          className="rounded-full px-3 py-1 text-encre-douce hover:bg-laiton/10 hover:text-encre"
        >
          Suivi des dépenses
        </Link>
      </nav>
      <div className="flex items-center justify-between">
        <p className="text-sm text-encre-douce">
          Qui a payé quoi — les comptes clairs, l'amitié durable.
        </p>
        <Button type="button" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Annuler" : "Ajouter une dépense"}
        </Button>
      </div>

      {showForm ? (
        <form
          action={formAction}
          className="flex flex-col gap-3 rounded-lg border border-laiton-clair bg-papier px-4 py-3"
        >
          <input type="hidden" name="tripId" value={tripId} />
          <div className="grid grid-cols-2 gap-3">
            <Input name="title" placeholder="Catamaran, courses…" required maxLength={200} />
            <div className="flex gap-2">
              <Input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="450"
                required
              />
              <Input name="currency" defaultValue="EUR" maxLength={3} className="w-20" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm text-encre">
              Catégorie
              <select
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="rounded border border-laiton-clair bg-papier px-2 py-1.5 text-sm"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1 text-sm text-encre">
              <label htmlFor="spentOn">Date</label>
              <Input
                id="spentOn"
                name="spentOn"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
          </div>
          <label className="flex flex-col gap-1 text-sm text-encre">
            Événement lié (optionnel)
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
              <option value="">Aucun</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-encre">
            Payé par
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
          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-1 text-sm text-encre">Pour qui :</legend>
            {members.map((m) => (
              <label
                key={m.userId}
                className="flex items-center gap-1.5 rounded-full border border-laiton-clair px-2.5 py-1 text-xs text-encre"
              >
                <input
                  type="checkbox"
                  name="beneficiaries"
                  value={m.userId}
                  defaultChecked
                  className="accent-[#6e1f2e]"
                />
                {nameOf(m.userId)}
              </label>
            ))}
          </fieldset>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={formPending}>
              {formPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
            {state.status === "error" ? (
              <p className="text-xs text-bordeaux">{state.message}</p>
            ) : null}
          </div>
        </form>
      ) : null}

      {balancesByCurrency.map(({ currency, total, balances, settlements }) => (
        <section
          key={currency}
          className="rounded-lg border border-laiton-clair bg-papier px-4 py-3"
        >
          <h2 className="mb-2 flex items-baseline justify-between text-sm font-medium text-encre">
            <span>Soldes ({currency})</span>
            <span className="text-encre-douce">Total : {fmt(total, currency)}</span>
          </h2>
          <div className="flex flex-col gap-1">
            {balances.map((b) => (
              <p key={b.userId} className="flex justify-between text-sm">
                <span className="text-encre">{nameOf(b.userId)}</span>
                <span className={b.net >= 0 ? "text-encre-douce" : "text-bordeaux"}>
                  a payé {fmt(b.paid, currency)} · part {fmt(b.owed, currency)} ·{" "}
                  {b.net >= 0 ? `+${fmt(b.net, currency)}` : fmt(b.net, currency)}
                </span>
              </p>
            ))}
          </div>
          {settlements.length > 0 ? (
            <div className="mt-3 border-t border-laiton-clair/50 pt-2">
              <p className="mb-1 text-xs font-medium text-laiton uppercase">Pour s'équilibrer</p>
              {settlements.map((s) => (
                <p
                  key={`${s.from}-${s.to}`}
                  className="flex items-center justify-between gap-2 text-sm text-encre"
                >
                  <span>
                    {nameOf(s.from)} doit {fmt(s.amount, currency)} à {nameOf(s.to)}
                  </span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(() => markSettled(tripId, s.from, s.to, s.amount, currency))
                    }
                    className="shrink-0 rounded-full border border-laiton-clair px-2.5 py-0.5 text-xs text-encre-douce transition-colors hover:border-bordeaux hover:text-bordeaux"
                    title="Enregistre le remboursement et remet les soldes à jour"
                  >
                    Marquer comme réglé
                  </button>
                </p>
              ))}
            </div>
          ) : null}
        </section>
      ))}

      <section className="flex flex-col gap-1.5">
        <h2 className="text-sm font-medium text-laiton uppercase tracking-wide">Dépenses</h2>
        {expenses.length === 0 ? (
          <p className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-4 py-8 text-center text-sm text-encre-douce">
            Aucune dépense — le voyage n'a encore rien coûté, profites-en.
          </p>
        ) : (
          expenses.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 rounded-md border border-laiton-clair/60 bg-papier px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate text-encre">
                {e.isSettlement ? "↩ " : ""}
                {e.title}
                {e.isSettlement ? (
                  <span className="ml-1.5 rounded-full bg-encre/10 px-2 py-0.5 text-[0.65rem] text-encre-douce">
                    entre voyageurs
                  </span>
                ) : (
                  <span className="ml-1.5 rounded-full bg-laiton/15 px-2 py-0.5 text-[0.65rem] text-laiton">
                    {CATEGORY_LABELS[e.category as ExpenseCategory] ?? e.category}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-xs text-encre-douce">
                {e.isSettlement
                  ? `${nameOf(e.paid_by)} → ${nameOf(e.beneficiaries[0] ?? "")}`
                  : `${nameOf(e.paid_by)} · pour ${e.beneficiaries.length}`}
              </span>
              <span className="shrink-0 font-medium text-encre">{fmt(e.amount, e.currency)}</span>
              {e.created_by === myId || e.paid_by === myId || isOwner ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(() => deleteExpense(tripId, e.id))}
                  className="text-encre-douce hover:text-bordeaux"
                  aria-label={`Supprimer ${e.title}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
