"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { EXPENSE_CATEGORIES } from "@/lib/budget/categories";
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
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
  // PHIL-Q21 : division à la Tricount
  splitMode: z.enum(["equal", "shares", "exact"]).default("equal"),
});

export type ExpenseState = { status: "idle" | "error"; message?: string };

/** Enregistre une dépense partagée (PHIL-N09, division PHIL-Q21). */
export async function addExpense(_prev: ExpenseState, formData: FormData): Promise<ExpenseState> {
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
    return { status: "error", message: "Montant, payeur et au moins un bénéficiaire requis." };
  }

  // Parts / montants exacts par bénéficiaire (champs share-<userId>)
  const shares = new Map<string, number>();
  if (parsed.data.splitMode !== "equal") {
    for (const userId of parsed.data.beneficiaries) {
      const raw = Number(formData.get(`share-${userId}`));
      if (!Number.isFinite(raw) || raw < 0) {
        return { status: "error", message: "Parts ou montants invalides." };
      }
      shares.set(userId, raw);
    }
    const total = [...shares.values()].reduce((s, v) => s + v, 0);
    if (parsed.data.splitMode === "exact" && Math.abs(total - parsed.data.amount) > 0.01) {
      return {
        status: "error",
        message: `La somme des montants (${total.toFixed(2)}) doit faire ${parsed.data.amount.toFixed(2)}.`,
      };
    }
    if (parsed.data.splitMode === "shares" && total <= 0) {
      return { status: "error", message: "Il faut au moins une part." };
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
    return { status: "error", message: "La Bourse est close — rouvre-la pour ajouter." };
  }

  const expenseId = crypto.randomUUID();
  const { error } = await supabase.from("expenses").insert({
    id: expenseId,
    trip_id: d.tripId,
    title: d.title,
    amount: d.amount,
    currency: d.currency,
    paid_by: d.paidBy,
    category: d.category,
    event_id: d.eventId || null,
    spent_on: d.spentOn,
    split_mode: d.splitMode,
    created_by: user.id,
  });
  if (error) {
    return { status: "error", message: "Enregistrement impossible." };
  }

  const { error: benefError } = await supabase.from("expense_beneficiaries").insert(
    d.beneficiaries.map((userId) => ({
      expense_id: expenseId,
      user_id: userId,
      share: d.splitMode === "equal" ? null : (shares.get(userId) ?? 0),
    })),
  );
  if (benefError) {
    await supabase.from("expenses").delete().eq("id", expenseId);
    return { status: "error", message: "Bénéficiaires invalides." };
  }

  revalidatePath(`/trips/${d.tripId}/budget`);
  revalidatePath(`/trips/${d.tripId}/budget/equilibre`);
  revalidatePath(`/trips/${d.tripId}/budget/depenses`);
  return { status: "idle" };
}

/** Clore / rouvrir la Bourse (PHIL-Q21) — Capitaine uniquement. */
export async function setPurseClosed(tripId: string, closed: boolean): Promise<void> {
  if (!areUuids(tripId)) {
    return;
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
    return;
  }
  await supabase
    .from("trips")
    .update({ purse_closed_at: closed ? new Date().toISOString() : null })
    .eq("id", tripId);
  revalidatePath(`/trips/${tripId}/budget`);
  revalidatePath(`/trips/${tripId}/budget/equilibre`);
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
): Promise<void> {
  const parsed = settlementSchema.safeParse({ tripId, fromUserId, toUserId, amount, currency });
  if (!parsed.success || parsed.data.fromUserId === parsed.data.toUserId) {
    return;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const d = parsed.data;
  const expenseId = crypto.randomUUID();
  const { error } = await supabase.from("expenses").insert({
    id: expenseId,
    trip_id: d.tripId,
    title: "Remboursement",
    amount: d.amount,
    currency: d.currency,
    paid_by: d.fromUserId,
    category: "autre",
    is_settlement: true,
    created_by: user.id,
  });
  if (error) {
    return;
  }
  const { error: benefError } = await supabase
    .from("expense_beneficiaries")
    .insert({ expense_id: expenseId, user_id: d.toUserId });
  if (benefError) {
    await supabase.from("expenses").delete().eq("id", expenseId);
    return;
  }
  revalidatePath(`/trips/${d.tripId}/budget`);
  revalidatePath(`/trips/${d.tripId}/budget/equilibre`);
  revalidatePath(`/trips/${d.tripId}/budget/depenses`);
}

export async function deleteExpense(tripId: string, expenseId: string): Promise<void> {
  if (!areUuids(tripId, expenseId)) {
    return;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  await supabase.from("expenses").delete().eq("id", expenseId).eq("trip_id", tripId);
  revalidatePath(`/trips/${tripId}/budget`);
  revalidatePath(`/trips/${tripId}/budget/equilibre`);
  revalidatePath(`/trips/${tripId}/budget/depenses`);
}
