"use client";

import { useState, useTransition } from "react";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type InviteFriendState, inviteFriend } from "./actions";

type InvitableTrip = { id: string; name: string };

/** Ré-invitation en un clic depuis le carnet d'amis (PHIL-D08). */
export function FriendInvite({
  friendUserId,
  trips,
}: {
  friendUserId: string;
  trips: InvitableTrip[];
}) {
  const t = useT();
  const [tripId, setTripId] = useState(trips[0]?.id ?? "");
  const [state, setState] = useState<InviteFriendState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  if (trips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Select value={tripId} onValueChange={setTripId}>
        <SelectTrigger className="h-8 w-44 text-xs">
          <SelectValue placeholder={t("friends.chooseTrip")} />
        </SelectTrigger>
        <SelectContent>
          {trips.map((tr) => (
            <SelectItem key={tr.id} value={tr.id}>
              {tr.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending || !tripId}
        onClick={() =>
          startTransition(async () => setState(await inviteFriend(friendUserId, tripId)))
        }
      >
        {pending ? t("friends.inviting") : t("friends.invite")}
      </Button>
      {state.status !== "idle" ? (
        <p
          className={`w-full text-right text-xs ${state.status === "error" ? "text-bordeaux" : "text-encre-douce"}`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
