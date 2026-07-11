"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useRef, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  addChecklistItem,
  type ChecklistState,
  deleteChecklistItem,
  toggleChecklistItem,
} from "../../checklist/actions";

export type PackingItem = {
  id: string;
  title: string;
  done: boolean;
  created_by: string;
};

/** "À emporter" pour cet événement (PHIL-O05) — items de la Valise rattachés. */
export function EventPacking({
  tripId,
  eventId,
  items,
  myId,
  isOwner,
}: {
  tripId: string;
  eventId: string;
  items: PackingItem[];
  myId: string;
  isOwner: boolean;
}) {
  const t = useT();
  const formRef = useRef<HTMLFormElement>(null);
  const [, formAction] = useActionState<ChecklistState, FormData>(
    async (prev, formData) => {
      const result = await addChecklistItem(prev, formData);
      if (result.status === "idle") {
        formRef.current?.reset();
      }
      return result;
    },
    { status: "idle" },
  );
  const [pending, startTransition] = useTransition();

  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-slate">{t("events.packing.heading")}</h2>
      {items.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-line/60 bg-card px-3 py-2"
            >
              <input
                type="checkbox"
                checked={item.done}
                disabled={pending}
                onChange={(e) =>
                  startTransition(() =>
                    toggleChecklistItem(tripId, item.id, e.target.checked, eventId),
                  )
                }
                className="size-4 accent-lagoon-ink"
                aria-label={`${t("events.packing.takenAriaPrefix")}${item.title}`}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 text-sm",
                  item.done ? "text-slate line-through" : "text-ink",
                )}
              >
                {item.title}
              </span>
              {item.created_by === myId || isOwner ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(() => deleteChecklistItem(tripId, item.id, eventId))
                  }
                  className="text-slate hover:text-lagoon-ink"
                  aria-label={`${t("events.packing.deleteAriaPrefix")}${item.title}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-line bg-card/60 px-4 py-4 text-center text-sm text-slate">
          {t("events.packing.empty")}
        </p>
      )}
      <form ref={formRef} action={formAction} className="mt-2 flex items-center gap-2">
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="section" value="a_emporter" />
        <Input
          name="title"
          placeholder={t("events.packing.placeholder")}
          className="h-8 flex-1 text-sm"
          required
          maxLength={200}
        />
        <Button type="submit" size="sm" variant="outline">
          {t("events.packing.add")}
        </Button>
      </form>
      <p className="mt-1 text-xs text-slate">{t("events.packing.footnote")}</p>
    </section>
  );
}
