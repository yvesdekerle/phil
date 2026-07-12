"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { useLocale, useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  addMeal,
  addShoppingItem,
  deleteMeal,
  deleteShoppingItem,
  type MiamState,
  toggleShoppingItem,
} from "./actions";
import { MEAL_SLOTS } from "./meal-constants";

export type Meal = {
  id: string;
  day: string;
  slot: string;
  title: string;
  cook_ids: string[];
  notes: string | null;
  created_by: string;
};
export type ShoppingItem = {
  id: string;
  label: string;
  quantity: string | null;
  checked: boolean;
  checked_by: string | null;
  created_by: string;
};
type Member = { userId: string; name: string };

const SLOT_ORDER: Record<string, number> = { BREAKFAST: 0, LUNCH: 1, DINNER: 2, OTHER: 3 };

export function MiamClient({
  tripId,
  meals,
  shopping,
  members,
  myId,
  isOwner,
  startDate,
  endDate,
}: {
  tripId: string;
  meals: Meal[];
  shopping: ShoppingItem[];
  members: Member[];
  myId: string;
  isOwner: boolean;
  startDate: string | null;
  endDate: string | null;
}) {
  const t = useT();
  const locale = useLocale();
  // V06f : « on veut Repas en 1er » — les repas d'abord, les courses ensuite.
  const [view, setView] = useState<"shopping" | "meals">("meals");
  const [, mealAction] = useActionState<MiamState, FormData>(addMeal, { status: "idle" });
  const [, shopAction] = useActionState<MiamState, FormData>(addShoppingItem, { status: "idle" });
  const [pending, startTransition] = useTransition();

  const nameOf = (userId: string) =>
    members.find((m) => m.userId === userId)?.name ?? t("miam.travelerFallback");
  const dayLabel = (day: string) =>
    new Date(`${day}T12:00:00`).toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  const days = [...new Set(meals.map((m) => m.day))].sort();
  const checked = shopping.filter((s) => s.checked).length;
  const canManage = (createdBy: string) => createdBy === myId || isOwner;

  return (
    <div className="flex flex-col gap-4">
      {/* Sous-vues */}
      <nav
        className="inline-flex w-fit items-center gap-1 rounded-full bg-wash p-1"
        aria-label={t("miam.viewsAria")}
      >
        {(["meals", "shopping"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "relative h-8 rounded-full px-3 text-ui transition-colors outline-none focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand active:scale-[.98]",
              view === v ? "bg-ink text-white" : "text-slate hover:text-ink",
            )}
          >
            {t(`miam.view.${v}`)}
          </button>
        ))}
      </nav>

      {view === "shopping" ? (
        <div className="flex flex-col gap-3">
          {shopping.length > 0 ? (
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-lagoon-wash">
                <div
                  className="h-full rounded-full bg-lagoon transition-all"
                  style={{ width: `${(checked / shopping.length) * 100}%` }}
                />
              </div>
              <span className="shrink-0 font-mono text-caption font-bold text-slate tabular-nums">
                {checked}/{shopping.length}
              </span>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-line bg-card/60 px-4 py-6 text-center text-sm text-slate">
              {t("miam.shoppingEmpty")}
            </p>
          )}

          {/* L4e — Courses : cases carrées, colonne de droite = quantités mono-caps */}
          <ul className="divide-y divide-wash rounded-lg border border-line bg-card">
            {shopping.map((item) => (
              <li key={item.id} className="flex min-h-11 items-center gap-2.5 px-3 py-1.5">
                <input
                  type="checkbox"
                  checked={item.checked}
                  disabled={pending}
                  onChange={(e) =>
                    startTransition(() => toggleShoppingItem(tripId, item.id, e.target.checked))
                  }
                  className="size-5 shrink-0 rounded-sm accent-lagoon-ink"
                  aria-label={`${t("miam.checkAria")} ${item.label}`}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-body",
                    item.checked ? "text-slate line-through" : "text-ink",
                  )}
                >
                  {item.label}
                </span>
                {item.quantity ? (
                  <span className="shrink-0 font-mono text-label text-mist uppercase tabular-nums">
                    {item.quantity}
                  </span>
                ) : null}
                {canManage(item.created_by) ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => startTransition(() => deleteShoppingItem(tripId, item.id))}
                    className="rounded-sm text-slate transition-colors outline-none hover:text-berry-ink focus-visible:ring-2 focus-visible:ring-citron"
                    aria-label={t("miam.remove")}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>

          <form
            action={shopAction}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-card px-4 py-3"
          >
            <input type="hidden" name="tripId" value={tripId} />
            <Input
              name="label"
              placeholder={t("miam.itemPlaceholder")}
              required
              maxLength={200}
              className="h-8 min-w-40 flex-1 text-sm"
            />
            <Input
              name="quantity"
              placeholder={t("miam.quantityPlaceholder")}
              maxLength={40}
              className="h-8 w-24 text-sm"
              aria-label={t("miam.quantityAria")}
            />
            <Button type="submit" size="sm" variant="outline">
              {t("miam.add")}
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {days.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line bg-card/60 px-4 py-6 text-center text-sm text-slate">
              {t("miam.mealsEmpty")}
            </p>
          ) : (
            days.map((day) => (
              <section key={day}>
                <h2 className="mb-1.5 text-xs font-medium text-mist uppercase tracking-wide">
                  {dayLabel(day)}
                </h2>
                <ul className="flex flex-col gap-1.5">
                  {meals
                    .filter((m) => m.day === day)
                    .sort((a, b) => (SLOT_ORDER[a.slot] ?? 9) - (SLOT_ORDER[b.slot] ?? 9))
                    .map((meal) => (
                      <li
                        key={meal.id}
                        className="flex items-start gap-2 rounded-md border border-line/60 bg-card px-3 py-2"
                      >
                        <span className="mt-0.5 shrink-0 rounded-full bg-lagoon-ink/10 px-2 py-0.5 text-[0.65rem] font-medium text-lagoon-ink">
                          {t(`miam.slot.${meal.slot}`)}
                        </span>
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="text-ink">{meal.title}</span>
                          {meal.cook_ids.length > 0 ? (
                            <span className="ml-1.5 text-xs text-slate">
                              {t("miam.cookBy")} {meal.cook_ids.map(nameOf).join(", ")}
                            </span>
                          ) : null}
                          {meal.notes ? (
                            <span className="block text-xs text-slate">{meal.notes}</span>
                          ) : null}
                        </span>
                        {canManage(meal.created_by) ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => startTransition(() => deleteMeal(tripId, meal.id))}
                            className="text-slate hover:text-lagoon-ink"
                            aria-label={t("miam.remove")}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        ) : null}
                      </li>
                    ))}
                </ul>
              </section>
            ))
          )}

          <form
            action={mealAction}
            className="flex flex-col gap-2 rounded-lg border border-line bg-card px-4 py-3"
          >
            <input type="hidden" name="tripId" value={tripId} />
            <div className="flex flex-wrap items-center gap-2">
              <Input
                name="day"
                type="date"
                required
                min={startDate ?? undefined}
                max={endDate ?? undefined}
                className="h-8 w-40 text-sm"
                aria-label={t("miam.dayAria")}
              />
              <select
                name="slot"
                defaultValue="DINNER"
                className="h-8 rounded border border-line bg-card px-2 text-sm text-ink"
                aria-label={t("miam.slotAria")}
              >
                {MEAL_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {t(`miam.slot.${s}`)}
                  </option>
                ))}
              </select>
              <Input
                name="title"
                placeholder={t("miam.mealPlaceholder")}
                required
                maxLength={200}
                className="h-8 min-w-40 flex-1 text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-slate">{t("miam.cooksLabel")}</span>
              {members.map((m) => (
                <label key={m.userId} className="cursor-pointer">
                  <input type="checkbox" name="cookIds" value={m.userId} className="peer sr-only" />
                  <span className="rounded-full border border-line px-2 py-0.5 text-xs text-slate transition-colors peer-checked:border-lagoon-ink peer-checked:bg-lagoon-ink peer-checked:text-card">
                    {m.userId === myId ? t("miam.you") : m.name}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                name="notes"
                placeholder={t("miam.notesPlaceholder")}
                maxLength={500}
                className="h-8 flex-1 text-sm"
              />
              <Button type="submit" size="sm" variant="outline">
                {t("miam.add")}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
