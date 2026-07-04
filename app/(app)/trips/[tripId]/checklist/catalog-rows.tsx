"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import {
  type CatalogSection,
  catalogItemTitle,
  matchesCatalogItem,
  PACKING_CATALOG,
} from "@/lib/trips/packing-catalog";
import { addChecklistItem } from "./actions";
import type { ChecklistItem } from "./checklist-client";

/**
 * Suggestions du catalogue intégrées à chaque section de la Valise
 * (PHIL-Q20) : en attente tant qu'on ne les a pas sélectionnées, un tap
 * pour les ajouter — quantité ajustable avant.
 */
export function CatalogRows({
  tripId,
  section,
  items,
  nights,
}: {
  tripId: string;
  section: CatalogSection;
  items: ChecklistItem[];
  nights: number;
}) {
  const [qtyOverrides, setQtyOverrides] = useState<Record<string, number>>({});
  const [pending, startTransition] = useTransition();

  const groups = PACKING_CATALOG.filter((c) => c.section === section);
  const isInList = (title: string) => items.some((i) => matchesCatalogItem(i.title, title));

  const add = (title: string, qty: number) => {
    const formData = new FormData();
    formData.set("tripId", tripId);
    formData.set("section", section);
    formData.set("title", catalogItemTitle(title, qty));
    startTransition(async () => {
      await addChecklistItem({ status: "idle" }, formData);
    });
  };

  const pendingGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !isInList(i.title)) }))
    .filter((g) => g.items.length > 0);
  if (pendingGroups.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      {pendingGroups.map((group) => (
        <div key={group.category}>
          <p className="mb-1 text-[0.65rem] text-encre-douce/80 uppercase tracking-wide">
            À sélectionner — {group.category}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {group.items.map((item) => {
              const qty = qtyOverrides[item.title] ?? item.qty(nights);
              const showQty = item.qty(nights) > 1 || qty > 1;
              return (
                <li
                  key={item.title}
                  className="flex items-center gap-1 rounded-full border border-dashed border-laiton-clair/80 py-0.5 pr-1 pl-2.5 text-xs text-encre-douce"
                >
                  {item.title}
                  {showQty ? (
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
                      className="w-11 rounded border border-laiton-clair/60 bg-transparent px-1 py-0 text-right text-xs"
                      aria-label={`Quantité de ${item.title}`}
                    />
                  ) : null}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => add(item.title, qty)}
                    className="flex size-5 items-center justify-center rounded-full text-laiton transition-colors hover:bg-bordeaux hover:text-papier"
                    aria-label={`Ajouter ${item.title}`}
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
