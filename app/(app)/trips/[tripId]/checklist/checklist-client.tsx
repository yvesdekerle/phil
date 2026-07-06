"use client";

import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { useLocale, useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dateFnsLocale } from "@/lib/i18n/dates";
import {
  type CatalogSection,
  catalogItemTitle,
  matchesCatalogItem,
  PACKING_CATALOG,
} from "@/lib/trips/packing-catalog";
import { cn } from "@/lib/utils";
import {
  addChecklistItem,
  assignChecklistItem,
  type ChecklistState,
  deleteChecklistItem,
  toggleChecklistItem,
} from "./actions";

export type ChecklistItem = {
  id: string;
  section: string;
  title: string;
  done: boolean;
  assigned_to: string | null;
  created_by: string;
  /** PHIL-O05 : item rattaché à un événement ("à emporter" d'une activité). */
  event_id: string | null;
  eventTitle: string | null;
  /** PHIL-Q20 : échéance optionnelle ("vaccins avant le…"). */
  due_date: string | null;
  /** PHIL-Q27 : catégorie de rangement libre. */
  category: string | null;
};
type Member = { userId: string; name: string };

const SECTION_KEYS: CatalogSection[] = ["a_emporter", "avant_depart", "sur_place"];

/** Valise partagée (PHIL-N11, refonte onglets/catégories PHIL-Q27). */
export function ChecklistClient({
  tripId,
  items,
  members,
  myId,
  isOwner,
  nights = 7,
}: {
  tripId: string;
  items: ChecklistItem[];
  members: Member[];
  myId: string;
  isOwner: boolean;
  /** PHIL-Q10 : durée du séjour pour les quantités proposées. */
  nights?: number;
}) {
  const t = useT();
  const dfLocale = dateFnsLocale(useLocale());
  const MISC = t("checklist.misc");
  const [tab, setTab] = useState<CatalogSection>("a_emporter");
  const [qtyOverrides, setQtyOverrides] = useState<Record<string, number>>({});
  const [, formAction] = useActionState<ChecklistState, FormData>(addChecklistItem, {
    status: "idle",
  });
  const [pending, startTransition] = useTransition();

  const doneCount = items.filter((i) => i.done).length;
  const sectionItems = items.filter((i) => i.section === tab);

  // Catalogue de l'onglet : ce qu'on peut encore sélectionner
  const isInList = (title: string) => items.some((i) => matchesCatalogItem(i.title, title));
  const pendingGroups = PACKING_CATALOG.filter((c) => c.section === tab)
    .map((g) => ({ ...g, items: g.items.filter((i) => !isInList(i.title)) }))
    .filter((g) => g.items.length > 0);

  // La liste (sélectionnés), groupée par catégorie
  const categories = [...new Set(sectionItems.map((i) => i.category?.trim() || MISC))].sort(
    (a, b) => (a === MISC ? 1 : b === MISC ? -1 : a.localeCompare(b, "fr")),
  );
  const categorySuggestions = [
    ...new Set([
      ...PACKING_CATALOG.filter((c) => c.section === tab).map((c) => c.category),
      ...sectionItems.map((i) => i.category?.trim()).filter((c): c is string => Boolean(c)),
    ]),
  ];

  const addFromCatalog = (title: string, qty: number, category: string) => {
    const formData = new FormData();
    formData.set("tripId", tripId);
    formData.set("section", tab);
    formData.set("title", catalogItemTitle(title, qty));
    formData.set("category", category);
    startTransition(async () => {
      await addChecklistItem({ status: "idle" }, formData);
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Onglets */}
      <nav className="flex gap-1 text-sm" aria-label={t("checklist.sectionsAria")}>
        {SECTION_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-full px-3 py-1",
              tab === key
                ? "bg-bordeaux font-medium text-papier"
                : "text-encre-douce hover:bg-laiton/10 hover:text-encre",
            )}
          >
            {t(`checklist.tabs.${key}`)}
          </button>
        ))}
      </nav>

      {items.length > 0 ? (
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-laiton-clair/40">
            <div
              className="h-full rounded-full bg-bordeaux transition-all"
              style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }}
            />
          </div>
          <span className="shrink-0 text-xs text-encre-douce">
            {doneCount}/{items.length}
          </span>
        </div>
      ) : null}

      {/* La liste : les éléments sélectionnés, par catégorie */}
      {sectionItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-4 py-6 text-center text-sm text-encre-douce">
          {t("checklist.emptyList")}
        </p>
      ) : (
        categories.map((category) => (
          <section key={category}>
            <h2 className="mb-1.5 text-xs font-medium text-laiton uppercase tracking-wide">
              {category}
            </h2>
            <ul className="flex flex-col gap-1.5">
              {sectionItems
                .filter((i) => (i.category?.trim() || MISC) === category)
                .map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center gap-2 rounded-md border border-laiton-clair/60 bg-papier px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      disabled={pending}
                      onChange={(e) =>
                        startTransition(() =>
                          toggleChecklistItem(
                            tripId,
                            item.id,
                            e.target.checked,
                            item.event_id ?? undefined,
                          ),
                        )
                      }
                      className="size-4 accent-[#6e1f2e]"
                      aria-label={`${t("checklist.doneAria")} ${item.title}`}
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 text-sm",
                        item.done ? "text-encre-douce line-through" : "text-encre",
                      )}
                    >
                      {item.title}
                      {item.due_date ? (
                        <span className="ml-1.5 text-xs text-encre-douce">
                          {t("checklist.dueBefore")}{" "}
                          {format(new Date(`${item.due_date}T12:00:00`), "d MMM", {
                            locale: dfLocale,
                          })}
                        </span>
                      ) : null}
                      {item.eventTitle ? (
                        <span className="ml-1.5 rounded-full bg-laiton/15 px-2 py-0.5 text-[0.65rem] text-laiton">
                          {item.eventTitle}
                        </span>
                      ) : null}
                    </span>
                    <select
                      value={item.assigned_to ?? ""}
                      disabled={pending}
                      onChange={(e) =>
                        startTransition(() =>
                          assignChecklistItem(tripId, item.id, e.target.value || null),
                        )
                      }
                      className="rounded border border-laiton-clair bg-papier px-1.5 py-1 text-xs text-encre-douce"
                      aria-label={t("checklist.assignAria")}
                    >
                      <option value="">{t("checklist.assignNobody")}</option>
                      {members.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.userId === myId ? t("checklist.you") : m.name}
                        </option>
                      ))}
                    </select>
                    {item.created_by === myId || isOwner ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          startTransition(() =>
                            deleteChecklistItem(tripId, item.id, item.event_id ?? undefined),
                          )
                        }
                        className="text-encre-douce hover:text-bordeaux"
                        aria-label={`${t("checklist.removePrefix")} ${item.title} ${t("checklist.removeSuffix")}`}
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

      {/* Ajouter ses propres éléments, avec catégorie libre */}
      <form
        action={formAction}
        className="flex flex-col gap-2 rounded-lg border border-laiton-clair bg-papier px-4 py-3"
      >
        <p className="text-xs font-medium text-encre">
          {t("checklist.addOwnTitle")}{" "}
          <span className="font-normal text-encre-douce">{t("checklist.addOwnHint")}</span>
        </p>
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="section" value={tab} />
        <div className="flex flex-wrap items-center gap-2">
          <Input
            name="title"
            placeholder={t("checklist.itemPlaceholder")}
            className="h-8 min-w-36 flex-1 text-sm"
            required
            maxLength={200}
          />
          <Input
            name="category"
            placeholder={t("checklist.categoryPlaceholder")}
            className="h-8 w-44 text-sm"
            maxLength={40}
            list={`categories-${tab}`}
            autoComplete="off"
          />
          <datalist id={`categories-${tab}`}>
            {categorySuggestions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Input
            name="dueDate"
            type="date"
            className="h-8 w-36 text-sm"
            aria-label={t("checklist.dueDateAria")}
            title={t("checklist.dueDateTitle")}
          />
          <Button type="submit" size="sm" variant="outline">
            {t("checklist.add")}
          </Button>
        </div>
      </form>

      {/* Encore à sélectionner : le catalogue, ligne à ligne */}
      {pendingGroups.length > 0 ? (
        <div className="flex flex-col gap-4 rounded-lg border border-dashed border-laiton-clair/80 bg-papier/50 px-4 py-3">
          <p className="text-xs text-encre-douce">
            {t("checklist.stillToSelectPrefix")} {nights} {t("checklist.stillToSelectSuffix")}
          </p>
          {pendingGroups.map((group) => (
            <div key={group.category}>
              <h3 className="mb-1 text-xs font-medium text-laiton uppercase tracking-wide">
                {group.category}
              </h3>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const qty = qtyOverrides[item.title] ?? item.qty(nights);
                  return (
                    <li
                      key={item.title}
                      className="flex items-center gap-2 rounded-md px-1 py-1 text-sm text-encre-douce"
                    >
                      <span className="min-w-0 flex-1">{item.title}</span>
                      {item.qty(nights) > 1 || qty > 1 ? (
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={qty}
                          onChange={(e) =>
                            setQtyOverrides((prev) => ({
                              ...prev,
                              [item.title]: Math.max(1, Number(e.target.value) || 1),
                            }))
                          }
                          className="w-14 rounded border border-laiton-clair bg-papier px-1.5 py-0.5 text-right text-xs"
                          aria-label={`${t("checklist.qtyPrefix")} ${item.title}`}
                        />
                      ) : null}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => addFromCatalog(item.title, qty, group.category)}
                        className="flex items-center gap-1 rounded-full border border-laiton-clair px-2.5 py-0.5 text-xs transition-colors hover:border-bordeaux hover:text-bordeaux"
                        aria-label={`${t("checklist.addItemPrefix")} ${item.title} ${t("checklist.addItemSuffix")}`}
                      >
                        <Plus className="size-3.5" aria-hidden="true" /> {t("checklist.add")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
