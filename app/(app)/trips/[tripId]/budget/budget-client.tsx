"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Balance, Settlement } from "@/lib/budget/balances";
import { addExpense, deleteExpense, type ExpenseState } from "./actions";

export type ExpenseRow = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  paid_by: string;
  created_by: string;
  beneficiaries: string[];
};
type Member = { userId: string; name: string };

/** Budget partagé (PHIL-N09) : dépenses, soldes, règlements. */
export function BudgetClient({
  tripId,
  expenses,
  balancesByCurrency,
  members,
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
  myId: string;
  isOwner: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
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
                <p key={`${s.from}-${s.to}`} className="text-sm text-encre">
                  {nameOf(s.from)} doit {fmt(s.amount, currency)} à {nameOf(s.to)}
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
              <span className="min-w-0 flex-1 truncate text-encre">{e.title}</span>
              <span className="shrink-0 text-xs text-encre-douce">
                {nameOf(e.paid_by)} · pour {e.beneficiaries.length}
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
