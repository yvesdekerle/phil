"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { type InviteFriendState, inviteFriend } from "@/app/(app)/friends/actions";
import { useT } from "@/components/i18n/provider";
import { Input } from "@/components/ui/input";

export type FriendSuggestion = {
  userId: string;
  name: string;
  avatarUrl: string | null;
};

const PAGE_SIZE = 6;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * "Tes compagnons de route" (PHIL-Q06, liste + recherche/pagination PHIL-Q37c) :
 * les amis du carnet (D08) pas encore à bord, avec un bouton Ajouter — plus un
 * lien vers la page Amis. Un ajout = invitation (email + lien).
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
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = query.trim()
    ? friends.filter((f) => norm(f.name).includes(norm(query)))
    : friends;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const shown = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="rounded-lg border border-laiton-clair bg-papier px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-encre">{t("participants.suggestions.title")}</h3>
        <Link
          href="/friends"
          className="shrink-0 text-xs text-encre-douce underline underline-offset-4 hover:text-encre"
        >
          {t("participants.suggestions.addFriend")} →
        </Link>
      </div>

      {friends.length > PAGE_SIZE ? (
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder={t("participants.suggestions.search")}
          className="mb-2 h-9"
        />
      ) : null}

      {friends.length === 0 ? (
        <p className="py-1 text-sm text-encre-douce">{t("participants.suggestions.empty")}</p>
      ) : shown.length === 0 ? (
        <p className="py-1 text-sm text-encre-douce">{t("participants.suggestions.noMatch")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-laiton-clair/50">
          {shown.map((f) => {
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

      {pageCount > 1 ? (
        <div className="mt-2 flex items-center justify-end gap-3 text-xs text-encre-douce">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-full border border-laiton-clair p-1 transition-colors hover:border-laiton hover:text-encre disabled:opacity-40"
            aria-label={t("participants.suggestions.prev")}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <span className="tabular-nums">
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="rounded-full border border-laiton-clair p-1 transition-colors hover:border-laiton hover:text-encre disabled:opacity-40"
            aria-label={t("participants.suggestions.next")}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

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
