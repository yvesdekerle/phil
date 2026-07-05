"use client";

import { Heart } from "lucide-react";
import { useTransition } from "react";
import { toggleVote } from "@/app/(app)/trips/[tripId]/ideas/actions";
import { useT } from "@/components/i18n/provider";
import { cn } from "@/lib/utils";

export function VoteButton({
  tripId,
  ideaId,
  count,
  hasVoted,
}: {
  tripId: string;
  ideaId: string;
  count: number;
  hasVoted: boolean;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => toggleVote(tripId, ideaId))}
      aria-label={hasVoted ? t("ideas.removeVoteAria") : t("ideas.voteAria")}
      aria-pressed={hasVoted}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laiton disabled:opacity-50",
        hasVoted
          ? "border-bordeaux bg-bordeaux text-papier"
          : "border-laiton-clair bg-papier text-encre-douce hover:text-bordeaux",
      )}
    >
      <Heart className={cn("size-4", hasVoted && "fill-current")} aria-hidden="true" />
      {count}
    </button>
  );
}
