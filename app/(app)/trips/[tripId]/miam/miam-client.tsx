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
  cook_id: string | null;
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
  const [view, setView] = useState<"shopping" | "meals">("shopping");
  const [, mealAction] = useActionState<MiamState, FormData>(addMeal, { status: "idle" });
  const [, shopAction] = useActionState<MiamState, FormData>(addShoppingItem, { status: "idle" });
  const [pending, startTransition] = useTransition();

  const nameOf = (userId: string | null) =>
    (userId && members.find((m) => m.userId === userId)?.name) || t("miam.travelerFallback");
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
      <nav className="flex gap-1 text-sm" aria-label={t("miam.viewsAria")}>
        {(["shopping", "meals"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "rounded-full px-3 py-1",
              view === v
                ? "bg-bordeaux font-medium text-papier"
                : "text-encre-douce hover:bg-laiton/10 hover:text-encre",
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
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-laiton-clair/40">
                <div
                  className="h-full rounded-full bg-bordeaux transition-all"
                  style={{ width: `${(checked / shopping.length) * 100}%` }}
                />
              </div>
              <span className="shrink-0 text-xs text-encre-douce">
                {checked}/{shopping.length}
              </span>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-4 py-6 text-center text-sm text-encre-douce">
              {t("miam.shoppingEmpty")}
            </p>
          )}

          <ul className="flex flex-col gap-1.5">
            {shopping.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-md border border-laiton-clair/60 bg-papier px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  disabled={pending}
                  onChange={(e) =>
                    startTransition(() => toggleShoppingItem(tripId, item.id, e.target.checked))
                  }
                  className="size-4 accent-[#6e1f2e]"
                  aria-label={`${t("miam.checkAria")} ${item.label}`}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 text-sm",
                    item.checked ? "text-encre-douce line-through" : "text-encre",
                  )}
                >
                  {item.label}
                  {item.quantity ? (
                    <span className="ml-1.5 rounded-full bg-laiton/15 px-1.5 py-0.5 text-[0.65rem] font-medium text-laiton">
                      × {item.quantity}
                    </span>
                  ) : null}
                </span>
                {canManage(item.created_by) ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => startTransition(() => deleteShoppingItem(tripId, item.id))}
                    className="text-encre-douce hover:text-bordeaux"
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
            className="flex flex-wrap items-center gap-2 rounded-lg border border-laiton-clair bg-papier px-4 py-3"
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
            <p className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-4 py-6 text-center text-sm text-encre-douce">
              {t("miam.mealsEmpty")}
            </p>
          ) : (
            days.map((day) => (
              <section key={day}>
                <h2 className="mb-1.5 text-xs font-medium text-laiton uppercase tracking-wide">
                  {dayLabel(day)}
                </h2>
                <ul className="flex flex-col gap-1.5">
                  {meals
                    .filter((m) => m.day === day)
                    .sort((a, b) => (SLOT_ORDER[a.slot] ?? 9) - (SLOT_ORDER[b.slot] ?? 9))
                    .map((meal) => (
                      <li
                        key={meal.id}
                        className="flex items-start gap-2 rounded-md border border-laiton-clair/60 bg-papier px-3 py-2"
                      >
                        <span className="mt-0.5 shrink-0 rounded-full bg-bordeaux/10 px-2 py-0.5 text-[0.65rem] font-medium text-bordeaux">
                          {t(`miam.slot.${meal.slot}`)}
                        </span>
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="text-encre">{meal.title}</span>
                          {meal.cook_id ? (
                            <span className="ml-1.5 text-xs text-encre-douce">
                              {t("miam.cookBy")} {nameOf(meal.cook_id)}
                            </span>
                          ) : null}
                          {meal.notes ? (
                            <span className="block text-xs text-encre-douce">{meal.notes}</span>
                          ) : null}
                        </span>
                        {canManage(meal.created_by) ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => startTransition(() => deleteMeal(tripId, meal.id))}
                            className="text-encre-douce hover:text-bordeaux"
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
            className="flex flex-col gap-2 rounded-lg border border-laiton-clair bg-papier px-4 py-3"
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
                className="h-8 rounded border border-laiton-clair bg-papier px-2 text-sm text-encre"
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
              <select
                name="cookId"
                defaultValue=""
                className="h-8 rounded border border-laiton-clair bg-papier px-2 text-sm text-encre-douce"
                aria-label={t("miam.cookAria")}
              >
                <option value="">{t("miam.noCook")}</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.userId === myId ? t("miam.you") : m.name}
                  </option>
                ))}
              </select>
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
