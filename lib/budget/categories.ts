/** Catégories de dépenses (PHIL-O09). */

export const EXPENSE_CATEGORIES = [
  "transport",
  "logement",
  "activite",
  "resto",
  "courses",
  "autre",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  transport: "Transport",
  logement: "Logement",
  activite: "Activités",
  resto: "Restos",
  courses: "Courses",
  autre: "Autre",
};

/** Catégorie suggérée quand la dépense est rattachée à un événement. */
export function categoryForEventType(type: "TRANSPORT" | "LODGING" | "ACTIVITY"): ExpenseCategory {
  return type === "TRANSPORT" ? "transport" : type === "LODGING" ? "logement" : "activite";
}

export function asCategory(value: string | null | undefined): ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value ?? "")
    ? (value as ExpenseCategory)
    : "autre";
}
