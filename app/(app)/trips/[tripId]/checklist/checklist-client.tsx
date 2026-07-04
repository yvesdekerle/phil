"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
};
type Member = { userId: string; name: string };

const SECTION_LABELS: Record<string, string> = {
  avant_depart: "Avant le départ",
  a_emporter: "À emporter",
  sur_place: "Sur place",
};

/** Checklist partagée (PHIL-N11). */
export function ChecklistClient({
  tripId,
  items,
  members,
  myId,
  isOwner,
}: {
  tripId: string;
  items: ChecklistItem[];
  members: Member[];
  myId: string;
  isOwner: boolean;
}) {
  const [, formAction] = useActionState<ChecklistState, FormData>(addChecklistItem, {
    status: "idle",
  });
  const [pending, startTransition] = useTransition();

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="flex flex-col gap-6">
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

      {Object.entries(SECTION_LABELS).map(([section, label]) => {
        const sectionItems = items.filter((i) => i.section === section);
        return (
          <section key={section}>
            <h2 className="mb-2 text-sm font-medium text-laiton uppercase tracking-wide">
              {label}
            </h2>
            <ul className="flex flex-col gap-1.5">
              {sectionItems.map((item) => (
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
                    aria-label={`Fait : ${item.title}`}
                  />
                  <span
                    className={cn(
                      "min-w-0 flex-1 text-sm",
                      item.done ? "text-encre-douce line-through" : "text-encre",
                    )}
                  >
                    {item.title}
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
                    aria-label="Assigner à"
                  >
                    <option value="">Personne</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.userId === myId ? "Toi" : m.name}
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
                      aria-label={`Supprimer ${item.title}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            <form action={formAction} className="mt-2 flex items-center gap-2">
              <input type="hidden" name="tripId" value={tripId} />
              <input type="hidden" name="section" value={section} />
              <Input
                name="title"
                placeholder="Ajouter un élément…"
                className="h-8 flex-1 text-sm"
                required
                maxLength={200}
              />
              <Button type="submit" size="sm" variant="outline">
                Ajouter
              </Button>
            </form>
          </section>
        );
      })}
    </div>
  );
}
