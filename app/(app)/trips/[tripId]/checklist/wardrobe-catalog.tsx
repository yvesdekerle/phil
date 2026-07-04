"use client";

import { Check, ChevronDown, Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { catalogItemTitle, matchesCatalogItem, PACKING_CATALOG } from "@/lib/trips/packing-catalog";
import { cn } from "@/lib/utils";
import { addChecklistItem, deleteChecklistItem } from "./actions";
import type { ChecklistItem } from "./checklist-client";

/**
 * Garde-robe type (PHIL-Q10) : catalogue par catégorie avec quantités —
 * ce qui n'est pas encore sélectionné attend son "+", ce qui est dans la
 * valise se retire d'un clic.
 */
export function WardrobeCatalog({
  tripId,
  items,
  nights,
}: {
  tripId: string;
  items: ChecklistItem[];
  nights: number;
}) {
  const [open, setOpen] = useState(false);
  const [qtyOverrides, setQtyOverrides] = useState<Record<string, number>>({});
  const [pending, startTransition] = useTransition();

  const findExisting = (title: string) =>
    items.find((i) => i.section === "a_emporter" && matchesCatalogItem(i.title, title));

  const add = (title: string, qty: number) => {
    const formData = new FormData();
    formData.set("tripId", tripId);
    formData.set("section", "a_emporter");
    formData.set("title", catalogItemTitle(title, qty));
    startTransition(async () => {
      await addChecklistItem({ status: "idle" }, formData);
    });
  };

  const totalAdded = PACKING_CATALOG.flatMap((c) => c.items).filter((i) =>
    findExisting(i.title),
  ).length;
  const totalItems = PACKING_CATALOG.flatMap((c) => c.items).length;

  return (
    <section className="rounded-lg border border-laiton-clair bg-papier">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-encre">
          Garde-robe type
          <span className="ml-2 text-xs font-normal text-encre-douce">
            {totalAdded}/{totalItems} dans la valise · quantités pour {nights} nuits
          </span>
        </span>
        <ChevronDown
          className={cn("size-4 text-encre-douce transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div className="flex flex-col gap-4 border-t border-laiton-clair/50 px-4 py-3">
          {PACKING_CATALOG.map((cat) => (
            <div key={cat.category}>
              <h3 className="mb-1.5 text-xs font-medium text-laiton uppercase tracking-wide">
                {cat.category}
              </h3>
              <ul className="flex flex-col gap-1">
                {cat.items.map((item) => {
                  const existing = findExisting(item.title);
                  const qty = qtyOverrides[item.title] ?? item.qty(nights);
                  return (
                    <li
                      key={item.title}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm",
                        existing
                          ? "border-laiton/50 bg-laiton/10 text-encre"
                          : "border-dashed border-laiton-clair/70 text-encre-douce",
                      )}
                    >
                      {existing ? (
                        <Check className="size-3.5 shrink-0 text-laiton" aria-hidden="true" />
                      ) : (
                        <span className="size-3.5 shrink-0" />
                      )}
                      <span className="min-w-0 flex-1">
                        {existing ? existing.title : item.title}
                      </span>
                      {existing ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            startTransition(() => deleteChecklistItem(tripId, existing.id))
                          }
                          className="flex items-center gap-1 text-xs text-encre-douce hover:text-bordeaux"
                          aria-label={`Retirer ${item.title}`}
                        >
                          <X className="size-3.5" aria-hidden="true" /> Retirer
                        </button>
                      ) : (
                        <>
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
                            aria-label={`Quantité de ${item.title}`}
                          />
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => add(item.title, qty)}
                            className="flex items-center gap-1 rounded-full border border-laiton-clair px-2 py-0.5 text-xs transition-colors hover:border-bordeaux hover:text-bordeaux"
                            aria-label={`Ajouter ${item.title}`}
                          >
                            <Plus className="size-3.5" aria-hidden="true" /> Ajouter
                          </button>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
