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
});

export type ExpenseState = { status: "idle" | "error"; message?: string };

/** Enregistre une dépense partagée (PHIL-N09). */
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
  });
  if (!parsed.success) {
    return { status: "error", message: "Montant, payeur et au moins un bénéficiaire requis." };
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
    title: d.title,
    amount: d.amount,
    currency: d.currency,
    paid_by: d.paidBy,
    category: d.category,
    event_id: d.eventId || null,
    spent_on: d.spentOn,
    created_by: user.id,
  });
  if (error) {
    return { status: "error", message: "Enregistrement impossible." };
  }

  const { error: benefError } = await supabase
    .from("expense_beneficiaries")
    .insert(d.beneficiaries.map((userId) => ({ expense_id: expenseId, user_id: userId })));
  if (benefError) {
    await supabase.from("expenses").delete().eq("id", expenseId);
    return { status: "error", message: "Bénéficiaires invalides." };
  }

  revalidatePath(`/trips/${d.tripId}/budget`);
  revalidatePath(`/trips/${d.tripId}/budget/depenses`);
  return { status: "idle" };
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
  revalidatePath(`/trips/${tripId}/budget/depenses`);
}
