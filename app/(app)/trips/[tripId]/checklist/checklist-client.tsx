"use client";

import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type CatalogSection,
  catalogItemTitle,
  matchesCatalogKey,
  PACKING_CATALOG,
} from "@/lib/trips/packing-catalog";
import { cn } from "@/lib/utils";
import {
  addChecklistItem,
  assignChecklistItem,
  type ChecklistState,
  deleteChecklistItem,
  reorderChecklistItems,
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
  /** PHIL-S04 : quantité optionnelle (texte libre — "2", "3 paires"…). */
  quantity: string | null;
  /** PHIL-S04 : rang d'affichage au sein de la catégorie (drag-drop). */
  position: number;
  /** PHIL-Q27 : catégorie de rangement libre. */
  category: string | null;
};
type Member = { userId: string; name: string };

const SECTION_KEYS: CatalogSection[] = ["a_emporter", "avant_depart", "sur_place"];

/** Valise partagée (PHIL-N11, quantité + réordonnancement PHIL-S04). */
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
  const MISC = t("checklist.misc");
  const [tab, setTab] = useState<CatalogSection>("a_emporter");
  const [qtyOverrides, setQtyOverrides] = useState<Record<string, number>>({});
  const [, formAction] = useActionState<ChecklistState, FormData>(addChecklistItem, {
    status: "idle",
  });
  const [pending, startTransition] = useTransition();

  // PHIL-S04 : ordre local optimiste pour le drag-drop, resynchronisé au serveur.
  const [localItems, setLocalItems] = useState(items);
  useEffect(() => setLocalItems(items), [items]);
  const [dragId, setDragId] = useState<string | null>(null);

  const doneCount = localItems.filter((i) => i.done).length;
  const sectionItems = localItems.filter((i) => i.section === tab);
  const catKey = (i: ChecklistItem) => i.category?.trim() || MISC;
  const itemsOfCategory = (category: string) =>
    sectionItems.filter((i) => catKey(i) === category).sort((a, b) => a.position - b.position);

  // Catalogue de l'onglet : ce qu'on peut encore sélectionner (dédoublonnage par clé)
  const isInList = (key: string) => localItems.some((i) => matchesCatalogKey(i.title, key));
  const pendingGroups = PACKING_CATALOG.filter((c) => c.section === tab)
    .map((g) => ({ ...g, items: g.items.filter((i) => !isInList(i.key)) }))
    .filter((g) => g.items.length > 0);

  // La liste (sélectionnés), groupée par catégorie. PHIL-S04 : l'ordre des
  // catégories suit la position (section-globale) de leur premier élément — MISC
  // en dernier —, ce qui les rend réordonnables via les flèches ↑/↓.
  const minPos = (cat: string) =>
    Math.min(...sectionItems.filter((i) => catKey(i) === cat).map((i) => i.position));
  const categories = [...new Set(sectionItems.map(catKey))].sort((a, b) => {
    if (a === MISC) return 1;
    if (b === MISC) return -1;
    const d = minPos(a) - minPos(b);
    return d !== 0 ? d : a.localeCompare(b, "fr");
  });
  const orderableCats = categories.filter((c) => c !== MISC);
  const categorySuggestions = [
    ...new Set([
      ...PACKING_CATALOG.filter((c) => c.section === tab).map((c) =>
        t(`checklist.catalogCat.${c.categoryKey}`),
      ),
      ...sectionItems.map((i) => i.category?.trim()).filter((c): c is string => Boolean(c)),
    ]),
  ];

  const addFromCatalog = (itemKey: string, qty: number, categoryKey: string) => {
    const formData = new FormData();
    formData.set("tripId", tripId);
    formData.set("section", tab);
    formData.set("title", catalogItemTitle(t(`checklist.catalog.${itemKey}`), qty));
    formData.set("category", t(`checklist.catalogCat.${categoryKey}`));
    startTransition(async () => {
      await addChecklistItem({ status: "idle" }, formData);
    });
  };

  // Réécrit les positions de TOUS les éléments de la section dans l'ordre donné
  // (positions section-globales → l'ordre des catégories est persistable).
  const persistSection = (orderedIds: string[]) => {
    setLocalItems((prev) =>
      prev.map((i) => {
        const idx = orderedIds.indexOf(i.id);
        return idx >= 0 ? { ...i, position: idx } : i;
      }),
    );
    startTransition(() => reorderChecklistItems(tripId, orderedIds));
  };

  // PHIL-S04 : drop d'un élément sur un autre de la MÊME catégorie → réordonne,
  // en conservant l'ordre section-global (les autres catégories ne bougent pas).
  const handleDrop = (target: ChecklistItem) => {
    const draggedId = dragId;
    setDragId(null);
    if (!draggedId || draggedId === target.id) {
      return;
    }
    const dragged = sectionItems.find((i) => i.id === draggedId);
    if (!dragged || catKey(dragged) !== catKey(target)) {
      return;
    }
    const reordered = itemsOfCategory(catKey(target)).filter((i) => i.id !== draggedId);
    reordered.splice(
      reordered.findIndex((i) => i.id === target.id),
      0,
      dragged,
    );
    persistSection(
      categories.flatMap((c) =>
        (c === catKey(target) ? reordered : itemsOfCategory(c)).map((i) => i.id),
      ),
    );
  };

  // PHIL-S04 : monte/descend une catégorie (hors MISC, gardé en dernier).
  const moveCategory = (category: string, dir: -1 | 1) => {
    const idx = orderableCats.indexOf(category);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= orderableCats.length) {
      return;
    }
    const next = [...orderableCats];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    if (categories.includes(MISC)) {
      next.push(MISC);
    }
    persistSection(next.flatMap((c) => itemsOfCategory(c).map((i) => i.id)));
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

      {localItems.length > 0 ? (
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-laiton-clair/40">
            <div
              className="h-full rounded-full bg-bordeaux transition-all"
              style={{ width: `${localItems.length ? (doneCount / localItems.length) * 100 : 0}%` }}
            />
          </div>
          <span className="shrink-0 text-xs text-encre-douce">
            {doneCount}/{localItems.length}
          </span>
        </div>
      ) : null}

      {/* La liste : les éléments sélectionnés, par catégorie */}
      {sectionItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-4 py-6 text-center text-sm text-encre-douce">
          {t("checklist.emptyList")}
        </p>
      ) : (
        categories.map((category) => {
          const oi = orderableCats.indexOf(category);
          return (
            <section key={category}>
              <div className="mb-1.5 flex items-center gap-1">
                <h2 className="text-xs font-medium text-laiton uppercase tracking-wide">
                  {category}
                </h2>
                {oi >= 0 && orderableCats.length > 1 ? (
                  <span className="flex items-center">
                    <button
                      type="button"
                      onClick={() => moveCategory(category, -1)}
                      disabled={oi === 0}
                      aria-label={t("checklist.moveCategoryUp")}
                      className="rounded p-0.5 text-encre-douce hover:text-encre disabled:opacity-30"
                    >
                      <ChevronUp className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCategory(category, 1)}
                      disabled={oi === orderableCats.length - 1}
                      aria-label={t("checklist.moveCategoryDown")}
                      className="rounded p-0.5 text-encre-douce hover:text-encre disabled:opacity-30"
                    >
                      <ChevronDown className="size-3.5" aria-hidden="true" />
                    </button>
                  </span>
                ) : null}
              </div>
              <ul className="flex flex-col gap-1.5">
                {itemsOfCategory(category).map((item) => (
                  <li
                    key={item.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(item)}
                    className={cn(
                      "flex flex-wrap items-center gap-2 rounded-md border border-laiton-clair/60 bg-papier px-2 py-2",
                      dragId === item.id && "opacity-40",
                    )}
                  >
                    <button
                      type="button"
                      draggable
                      onDragStart={() => setDragId(item.id)}
                      onDragEnd={() => setDragId(null)}
                      className="shrink-0 cursor-grab text-laiton-clair hover:text-laiton"
                      aria-label={t("checklist.reorderAria")}
                    >
                      <GripVertical className="size-4" aria-hidden="true" />
                    </button>
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
                      className="size-4 accent-bordeaux"
                      aria-label={`${t("checklist.doneAria")} ${item.title}`}
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 text-sm",
                        item.done ? "text-encre-douce line-through" : "text-encre",
                      )}
                    >
                      {item.title}
                      {item.quantity ? (
                        <span className="ml-1.5 rounded-full bg-laiton/15 px-1.5 py-0.5 text-[0.65rem] font-medium text-laiton">
                          × {item.quantity}
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
          );
        })
      )}

      {/* Ajouter ses propres éléments : titre, quantité (optionnel), catégorie */}
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
            name="quantity"
            placeholder={t("checklist.quantityPlaceholder")}
            className="h-8 w-20 text-sm"
            maxLength={40}
            aria-label={t("checklist.quantityAria")}
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
            <div key={group.categoryKey}>
              <h3 className="mb-1 text-xs font-medium text-laiton uppercase tracking-wide">
                {t(`checklist.catalogCat.${group.categoryKey}`)}
              </h3>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const qty = qtyOverrides[item.key] ?? item.qty(nights);
                  const name = t(`checklist.catalog.${item.key}`);
                  return (
                    <li
                      key={item.key}
                      className="flex items-center gap-2 rounded-md px-1 py-1 text-sm text-encre-douce"
                    >
                      <span className="min-w-0 flex-1">{name}</span>
                      {item.qty(nights) > 1 || qty > 1 ? (
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={qty}
                          onChange={(e) =>
                            setQtyOverrides((prev) => ({
                              ...prev,
                              [item.key]: Math.max(1, Number(e.target.value) || 1),
                            }))
                          }
                          className="w-14 rounded border border-laiton-clair bg-papier px-1.5 py-0.5 text-right text-xs"
                          aria-label={`${t("checklist.qtyPrefix")} ${name}`}
                        />
                      ) : null}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => addFromCatalog(item.key, qty, group.categoryKey)}
                        className="flex items-center gap-1 rounded-full border border-laiton-clair px-2.5 py-0.5 text-xs transition-colors hover:border-bordeaux hover:text-bordeaux"
                        aria-label={`${t("checklist.addItemPrefix")} ${name} ${t("checklist.addItemSuffix")}`}
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
