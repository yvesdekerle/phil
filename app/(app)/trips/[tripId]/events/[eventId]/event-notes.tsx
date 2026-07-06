"use client";

import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { useActionState, useRef, useTransition } from "react";
import { useLocale, useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Linkify } from "@/components/ui/linkify";
import { dateFnsLocale } from "@/lib/i18n/dates";
import { addEventNote, deleteEventNote, type NoteState } from "./note-actions";

export type EventNote = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  authorName: string;
};

/** Fil de notes sous un événement (PHIL-O04). */
export function EventNotes({
  tripId,
  eventId,
  notes,
  myId,
  isOwner,
}: {
  tripId: string;
  eventId: string;
  notes: EventNote[];
  myId: string;
  isOwner: boolean;
}) {
  const t = useT();
  const dfLocale = dateFnsLocale(useLocale());
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<NoteState, FormData>(
    async (prev, formData) => {
      const result = await addEventNote(prev, formData);
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
      <h2 className="mb-2 text-sm font-medium text-encre-douce">{t("events.notes.heading")}</h2>
      {notes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-4 py-4 text-center text-sm text-encre-douce">
          {t("events.notes.empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-lg border border-laiton-clair/60 bg-papier px-4 py-2.5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-laiton">
                  {note.author_id === myId ? t("events.you") : note.authorName}
                </span>
                <span className="flex items-center gap-2 text-xs text-encre-douce">
                  {format(new Date(note.created_at), "d MMM, HH'h'mm", { locale: dfLocale })}
                  {note.author_id === myId || isOwner ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(() => deleteEventNote(tripId, eventId, note.id))
                      }
                      className="text-encre-douce hover:text-bordeaux"
                      aria-label={t("events.notes.deleteAria")}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  ) : null}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-encre">
                <Linkify text={note.body} />
              </p>
            </li>
          ))}
        </ul>
      )}
      <form ref={formRef} action={formAction} className="mt-2 flex items-start gap-2">
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="eventId" value={eventId} />
        <textarea
          name="body"
          required
          maxLength={1000}
          rows={2}
          placeholder={t("events.notes.placeholder")}
          className="flex-1 rounded-md border border-laiton-clair bg-papier px-3 py-2 text-sm text-encre placeholder:text-encre-douce/70 focus:outline-none focus:ring-1 focus:ring-laiton"
        />
        <Button type="submit" size="sm" variant="outline">
          {t("events.notes.publish")}
        </Button>
      </form>
      {state.status === "error" ? (
        <p className="mt-1 text-xs text-bordeaux">{state.message}</p>
      ) : null}
    </section>
  );
}
