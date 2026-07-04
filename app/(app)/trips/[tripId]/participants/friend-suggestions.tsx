"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { type InviteFriendState, inviteFriend } from "@/app/(app)/friends/actions";

export type FriendSuggestion = {
  userId: string;
  name: string;
  avatarUrl: string | null;
};

/**
 * "Tes compagnons de route" (PHIL-Q06) : les amis du carnet (D08) pas encore
 * à bord — un tap = invitation (email + lien, même flux que D05).
 */
export function FriendSuggestions({
  tripId,
  friends,
}: {
  tripId: string;
  friends: FriendSuggestion[];
}) {
  const [state, setState] = useState<InviteFriendState>({ status: "idle" });
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  if (friends.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-laiton-clair bg-papier px-4 py-3">
      <h3 className="mb-2 text-sm font-medium text-encre">Tes compagnons de route</h3>
      <div className="flex flex-wrap gap-2">
        {friends.map((f) => {
          const done = invited.has(f.userId);
          return (
            <button
              key={f.userId}
              type="button"
              disabled={pending || done}
              onClick={() =>
                startTransition(async () => {
                  const result = await inviteFriend(f.userId, tripId);
                  setState(result);
                  if (result.status === "success") {
                    setInvited((prev) => new Set(prev).add(f.userId));
                  }
                })
              }
              className="flex items-center gap-2 rounded-full border border-laiton-clair bg-papier py-1 pr-3 pl-1 text-sm text-encre transition-colors hover:border-bordeaux hover:text-bordeaux disabled:opacity-60"
              title={done ? "Invitation envoyée" : `Inviter ${f.name}`}
            >
              {f.avatarUrl ? (
                <Image
                  src={f.avatarUrl}
                  alt=""
                  width={24}
                  height={24}
                  className="rounded-full border border-laiton-clair"
                />
              ) : (
                <span className="flex size-6 items-center justify-center rounded-full border border-laiton-clair bg-parchemin text-xs text-laiton">
                  {f.name.charAt(0).toUpperCase()}
                </span>
              )}
              {done ? `${f.name} ✓` : `+ ${f.name}`}
            </button>
          );
        })}
      </div>
      {state.status !== "idle" && state.message ? (
        <p
          className={`mt-2 text-xs ${state.status === "error" ? "text-bordeaux" : "text-encre-douce"}`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
