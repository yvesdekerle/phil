"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { deleteJournalEntry, type JournalState, saveJournalEntry } from "./journal-actions";

export type JournalEntry = {
  authorId: string;
  authorName: string;
  body: string;
};

/** Journal de bord du jour (PHIL-P08) : les mots de l'équipage + les miens. */
export function DayJournal({
  tripId,
  day,
  entries,
  myId,
}: {
  tripId: string;
  day: string;
  entries: JournalEntry[];
  myId: string;
}) {
  const t = useT();
  const [state, formAction] = useActionState<JournalState, FormData>(saveJournalEntry, {
    status: "idle",
  });
  const [pending, startTransition] = useTransition();
  const mine = entries.find((e) => e.authorId === myId);
  const others = entries.filter((e) => e.authorId !== myId);

  return (
    <section className="mt-6">
      <h2 className="mb-2 font-sans text-lg text-ink italic">{t("calendar.journal.heading")}</h2>
      {others.length === 0 && !mine ? (
        <p className="mb-2 text-sm text-slate">{t("calendar.journal.empty")}</p>
      ) : null}
      {others.length > 0 ? (
        <ul className="mb-3 flex flex-col gap-2">
          {others.map((e) => (
            <li key={e.authorId} className="rounded-lg border border-line/60 bg-card px-4 py-2.5">
              <p className="text-xs font-medium text-mist">{e.authorName}</p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink">{e.body}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <form action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="day" value={day} />
        <textarea
          name="body"
          key={mine?.body ?? "empty"}
          defaultValue={mine?.body ?? ""}
          required
          maxLength={2000}
          rows={3}
          placeholder={t("calendar.journal.placeholder")}
          className="rounded-md border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-slate/70 focus:outline-none focus:ring-1 focus:ring-citron"
        />
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" variant="outline">
            {mine ? t("calendar.journal.update") : t("calendar.journal.write")}
          </Button>
          {mine ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => deleteJournalEntry(tripId, day))}
              className="flex items-center gap-1 text-xs text-slate hover:text-lagoon-ink"
            >
              <Trash2 className="size-3.5" aria-hidden="true" /> {t("calendar.journal.delete")}
            </button>
          ) : null}
          {state.status === "error" ? (
            <p className="text-xs text-lagoon-ink">{state.message}</p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
