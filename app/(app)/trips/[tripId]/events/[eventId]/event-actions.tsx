"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteEvent, type EventActionState } from "./actions";

export function EventActions({
  tripId,
  eventId,
  eventTitle,
}: {
  tripId: string;
  eventId: string;
  eventTitle: string;
}) {
  const t = useT();
  const [state, setState] = useState<EventActionState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <Button asChild variant="outline">
        <Link href={`/trips/${tripId}/events/${eventId}/edit`}>{t("events.actions.edit")}</Link>
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" disabled={pending}>
            {t("events.actions.delete")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("events.actions.deletePrefix")}
              {eventTitle}
              {t("events.actions.deleteSuffix")}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("events.actions.deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("events.actions.keep")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                startTransition(async () => {
                  setState(await deleteEvent(tripId, eventId));
                })
              }
            >
              {t("events.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {state.status === "error" ? <p className="text-sm text-lagoon-ink">{state.message}</p> : null}
    </div>
  );
}
