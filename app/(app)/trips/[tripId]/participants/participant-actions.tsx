"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  changeParticipantRole,
  leaveTrip,
  type ParticipantActionState,
  removeParticipant,
  transferOwnership,
} from "./actions";

export function ParticipantRowActions({
  tripId,
  userId,
  userName,
  role,
}: {
  tripId: string;
  userId: string;
  userName: string;
  role: string;
}) {
  const [state, setState] = useState<ParticipantActionState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Select
        value={role}
        onValueChange={(v) =>
          startTransition(async () => setState(await changeParticipantRole(tripId, userId, v)))
        }
        disabled={pending}
      >
        <SelectTrigger size="sm" className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="EDITOR">Éditeur</SelectItem>
          <SelectItem value="VIEWER">Lecteur</SelectItem>
        </SelectContent>
      </Select>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={pending}>
            Passer capitaine
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transmettre la barre à {userName} ?</AlertDialogTitle>
            <AlertDialogDescription>
              {userName} devient capitaine du voyage, et tu repasses éditeur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                startTransition(async () => setState(await transferOwnership(tripId, userId)))
              }
            >
              Transmettre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" size="sm" disabled={pending}>
            Retirer
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Débarquer {userName} ?</AlertDialogTitle>
            <AlertDialogDescription>
              {userName} n'aura plus accès au voyage. Ses documents personnels restent dans son
              coffre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                startTransition(async () => setState(await removeParticipant(tripId, userId)))
              }
            >
              Retirer du voyage
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {state.status === "error" ? <p className="text-xs text-bordeaux">{state.message}</p> : null}
    </div>
  );
}

export function LeaveTripButton({ tripId }: { tripId: string }) {
  const [state, setState] = useState<ParticipantActionState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" disabled={pending}>
            Quitter le voyage
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter ce voyage ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu n'auras plus accès au calendrier ni aux documents du voyage. Tes documents
              personnels restent dans ton coffre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Rester à bord</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => startTransition(async () => setState(await leaveTrip(tripId)))}
            >
              Quitter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {state.status === "error" ? <p className="text-sm text-bordeaux">{state.message}</p> : null}
    </div>
  );
}
