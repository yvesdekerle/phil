"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { EXPENSE_CATEGORIES } from "@/lib/budget/categories";
import type { ActionState } from "@/lib/forms/action-state";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";

const expenseSchema = z.object({
  tripId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  amount: z.coerce.number().positive().max(1_000_000),
  currency: z.string().trim().toUpperCase().length(3),
  paidBy: z.string().uuid(),
  beneficiaries: z.array(z.string().uuid()).min(1),
  category: z.enum(EXPENSE_CATEGORIES),
  eventId: z.union([z.literal(""), z.string().uuid()]).optional(),
  // Message non surfacé (l'échec de parse remonte `budget.errors.invalidExpense`).
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // PHIL-Q21 : division à la Tricount
  splitMode: z.enum(["equal", "shares", "exact"]).default("equal"),
});

export type ExpenseState = ActionState;

/** Résultat d'une mutation directe (PHIL-Q58) — remonté à l'UI pour un toast. */
export type ActionResult = { ok: boolean; message?: string };

/** Enregistre une dépense partagée (PHIL-N09, division PHIL-Q21). */
export async function addExpense(_prev: ExpenseState, formData: FormData): Promise<ExpenseState> {
  const t = await getT();
  const parsed = expenseSchema.safeParse({
    tripId: formData.get("tripId"),
    title: formData.get("title"),
    amount: formData.get("amount"),
    currency: formData.get("currency") || "EUR",
    paidBy: formData.get("paidBy"),
    beneficiaries: formData.getAll("beneficiaries"),
    category: formData.get("category") ?? "autre",
    eventId: formData.get("eventId") ?? "",
    spentOn: formData.get("spentOn"),
    splitMode: formData.get("splitMode") ?? "equal",
  });
  if (!parsed.success) {
    return { status: "error", message: t("budget.errors.invalidExpense") };
  }

  // Parts / montants exacts par bénéficiaire (champs share-<userId>)
  const shares = new Map<string, number>();
  if (parsed.data.splitMode !== "equal") {
    for (const userId of parsed.data.beneficiaries) {
      const raw = Number(formData.get(`share-${userId}`));
      if (!Number.isFinite(raw) || raw < 0) {
        return { status: "error", message: t("budget.errors.invalidShares") };
      }
      shares.set(userId, raw);
    }
    const total = [...shares.values()].reduce((s, v) => s + v, 0);
    if (parsed.data.splitMode === "exact" && Math.abs(total - parsed.data.amount) > 0.01) {
      return {
        status: "error",
        message: `${t("budget.errors.sumPrefix")}${total.toFixed(2)}${t("budget.errors.sumMiddle")}${parsed.data.amount.toFixed(2)}.`,
      };
    }
    if (parsed.data.splitMode === "shares" && total <= 0) {
      return { status: "error", message: t("budget.errors.atLeastOneShare") };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const d = parsed.data;

  // PHIL-Q21 : Bourse close = plus d'ajout
  const { data: trip } = await supabase
    .from("trips")
    .select("purse_closed_at")
    .eq("id", d.tripId)
    .single();
  if (trip?.purse_closed_at) {
    return { status: "error", message: t("budget.errors.purseClosed") };
  }

  // PHIL-Q49 : insertion atomique (dépense + bénéficiaires) via RPC transactionnelle
  const { error } = await supabase.rpc("create_expense_with_beneficiaries", {
    p_trip_id: d.tripId,
    p_title: d.title,
    p_amount: d.amount,
    p_currency: d.currency,
    p_paid_by: d.paidBy,
    p_category: d.category,
    p_event_id: d.eventId || undefined,
    p_spent_on: d.spentOn,
    p_split_mode: d.splitMode,
    p_is_settlement: false,
    p_beneficiaries: d.beneficiaries.map((userId) => ({
      user_id: userId,
      share: d.splitMode === "equal" ? null : (shares.get(userId) ?? 0),
    })),
  });
  if (error) {
    return { status: "error", message: t("budget.errors.saveFailed") };
  }

  revalidatePath(`/trips/${d.tripId}/budget`);
  revalidatePath(`/trips/${d.tripId}/budget/equilibre`);
  revalidatePath(`/trips/${d.tripId}/budget/depenses`);
  return { status: "idle" };
}

/** Clore / rouvrir la Bourse (PHIL-Q21) — Capitaine uniquement. */
export async function setPurseClosed(tripId: string, closed: boolean): Promise<ActionResult> {
  const t = await getT();
  if (!areUuids(tripId)) {
    return { ok: false, message: t("budget.errors.invalidTrip") };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { data: me } = await supabase
    .from("trip_participants")
    .select("role")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .single();
  if (me?.role !== "OWNER") {
    return { ok: false, message: t("budget.errors.onlyCaptain") };
  }
  const { error } = await supabase
    .from("trips")
    .update({ purse_closed_at: closed ? new Date().toISOString() : null })
    .eq("id", tripId);
  if (error) {
    return { ok: false, message: t("budget.errors.actionUnavailable") };
  }
  revalidatePath(`/trips/${tripId}/budget`);
  revalidatePath(`/trips/${tripId}/budget/equilibre`);
  return { ok: true };
}

const settlementSchema = z.object({
  tripId: z.string().uuid(),
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  amount: z.coerce.number().positive().max(1_000_000),
  currency: z.string().trim().toUpperCase().length(3),
});

/** Marque un règlement comme effectué (PHIL-P04) : remboursement de from → to. */
export async function markSettled(
  tripId: string,
  fromUserId: string,
  toUserId: string,
  amount: number,
  currency: string,
): Promise<ActionResult> {
  const t = await getT();
  const parsed = settlementSchema.safeParse({ tripId, fromUserId, toUserId, amount, currency });
  if (!parsed.success || parsed.data.fromUserId === parsed.data.toUserId) {
    return { ok: false, message: t("budget.errors.invalidSettlement") };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const d = parsed.data;
  // PHIL-Q49 : règlement inséré atomiquement (dépense + bénéficiaire) via RPC
  const { error } = await supabase.rpc("create_expense_with_beneficiaries", {
    p_trip_id: d.tripId,
    p_title: t("budget.settlement.title"),
    p_amount: d.amount,
    p_currency: d.currency,
    p_paid_by: d.fromUserId,
    p_category: "autre",
    p_split_mode: "equal",
    p_is_settlement: true,
    p_beneficiaries: [{ user_id: d.toUserId, share: null }],
  });
  if (error) {
    return { ok: false, message: t("budget.errors.settlementFailed") };
  }
  revalidatePath(`/trips/${d.tripId}/budget`);
  revalidatePath(`/trips/${d.tripId}/budget/equilibre`);
  revalidatePath(`/trips/${d.tripId}/budget/depenses`);
  return { ok: true };
}

export async function deleteExpense(tripId: string, expenseId: string): Promise<ActionResult> {
  const t = await getT();
  if (!areUuids(tripId, expenseId)) {
    return { ok: false, message: t("budget.errors.invalidExpenseId") };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("trip_id", tripId);
  if (error) {
    return { ok: false, message: t("budget.errors.deleteFailed") };
  }
  revalidatePath(`/trips/${tripId}/budget`);
  revalidatePath(`/trips/${tripId}/budget/equilibre`);
  revalidatePath(`/trips/${tripId}/budget/depenses`);
  return { ok: true };
}
