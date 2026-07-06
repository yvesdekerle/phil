"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { type InviteFriendState, inviteFriend } from "@/app/(app)/friends/actions";
import { useT } from "@/components/i18n/provider";

export type FriendSuggestion = {
  userId: string;
  name: string;
  avatarUrl: string | null;
};

/**
 * "Tes compagnons de route" (PHIL-Q06, refonte liste PHIL-Q37c) : les amis du
 * carnet (D08) pas encore à bord, en liste avec un bouton Ajouter — plus un lien
 * vers la page Amis pour en ajouter de nouveaux. Un ajout = invitation (email + lien).
 */
export function FriendSuggestions({
  tripId,
  friends,
}: {
  tripId: string;
  friends: FriendSuggestion[];
}) {
  const t = useT();
  const [state, setState] = useState<InviteFriendState>({ status: "idle" });
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-lg border border-laiton-clair bg-papier px-4 py-3">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-encre">{t("participants.suggestions.title")}</h3>
        <Link
          href="/friends"
          className="text-xs text-encre-douce underline underline-offset-4 hover:text-encre"
        >
          {t("participants.suggestions.addFriend")} →
        </Link>
      </div>

      {friends.length === 0 ? (
        <p className="py-1 text-sm text-encre-douce">{t("participants.suggestions.empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-laiton-clair/50">
          {friends.map((f) => {
            const done = invited.has(f.userId);
            return (
              <li key={f.userId} className="flex items-center gap-3 py-2">
                {f.avatarUrl ? (
                  <Image
                    src={f.avatarUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="rounded-full border border-laiton-clair"
                  />
                ) : (
                  <span className="flex size-8 items-center justify-center rounded-full border border-laiton-clair bg-parchemin text-sm text-laiton">
                    {f.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm text-encre">{f.name}</span>
                <button
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
                  className="shrink-0 rounded-full border border-laiton-clair px-3 py-1 text-xs font-medium text-encre-douce transition-colors hover:border-bordeaux hover:text-bordeaux disabled:opacity-60"
                >
                  {done ? t("participants.suggestions.invited") : t("participants.suggestions.add")}
                </button>
              </li>
            );
          })}
        </ul>
      )}

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
