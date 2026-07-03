"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
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
  const [state, setState] = useState<EventActionState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <Button asChild variant="outline">
        <Link href={`/trips/${tripId}/events/${eventId}/edit`}>Modifier</Link>
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" disabled={pending}>
            Supprimer
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {eventTitle} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'événement quittera le calendrier. Les documents attachés ne sont pas supprimés,
              seulement détachés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Garder l'événement</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                startTransition(async () => {
                  setState(await deleteEvent(tripId, eventId));
                })
              }
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {state.status === "error" ? <p className="text-sm text-bordeaux">{state.message}</p> : null}
    </div>
  );
}
