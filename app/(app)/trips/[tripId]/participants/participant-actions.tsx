"use client";

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
  const t = useT();
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
          <SelectItem value="EDITOR">{t("participants.roleEditor")}</SelectItem>
          <SelectItem value="VIEWER">{t("participants.roleViewer")}</SelectItem>
        </SelectContent>
      </Select>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={pending}>
            {t("participants.actions.makeCaptain")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("participants.actions.transferTitle").replace("{name}", userName)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("participants.actions.transferDesc").replace("{name}", userName)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("participants.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                startTransition(async () => setState(await transferOwnership(tripId, userId)))
              }
            >
              {t("participants.actions.transfer")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" size="sm" disabled={pending}>
            {t("participants.actions.remove")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("participants.actions.removeTitle").replace("{name}", userName)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("participants.actions.removeDesc").replace("{name}", userName)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("participants.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                startTransition(async () => setState(await removeParticipant(tripId, userId)))
              }
            >
              {t("participants.actions.removeConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {state.status === "error" ? (
        <p className="text-caption text-berry-ink">{state.message}</p>
      ) : null}
    </div>
  );
}

export function LeaveTripButton({ tripId }: { tripId: string }) {
  const t = useT();
  const [state, setState] = useState<ParticipantActionState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" disabled={pending}>
            {t("participants.actions.leave")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("participants.actions.leaveTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("participants.actions.leaveDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("participants.actions.stay")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => startTransition(async () => setState(await leaveTrip(tripId)))}
            >
              {t("participants.actions.leaveConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {state.status === "error" ? (
        <p className="text-caption text-berry-ink">{state.message}</p>
      ) : null}
    </div>
  );
}
