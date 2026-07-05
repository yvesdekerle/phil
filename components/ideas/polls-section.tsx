"use client";

import { useActionState, useState, useTransition } from "react";
import {
  closePoll,
  createPoll,
  type PollState,
  votePoll,
} from "@/app/(app)/trips/[tripId]/ideas/poll-actions";
import { useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type Poll = {
  id: string;
  question: string;
  options: string[];
  closed_at: string | null;
  created_by: string;
  votes: { user_id: string; option_index: number }[];
};

/** Sondages éclair (PHIL-N12) : vote en un tap, résultats en direct. */
export function PollsSection({
  tripId,
  polls,
  myId,
  isOwner,
}: {
  tripId: string;
  polls: Poll[];
  myId: string;
  isOwner: boolean;
}) {
  const t = useT();
  const [showForm, setShowForm] = useState(false);
  const [state, formAction, formPending] = useActionState<PollState, FormData>(createPoll, {
    status: "idle",
  });
  const [pending, startTransition] = useTransition();

  if (polls.length === 0 && !showForm) {
    return (
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
          {t("ideas.pollQuick")}
        </Button>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-laiton-clair bg-papier px-4 py-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-encre">{t("ideas.pollSectionTitle")}</h2>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? t("ideas.cancel") : t("ideas.new")}
        </Button>
      </div>

      {showForm ? (
        <form action={formAction} className="flex flex-col gap-2 rounded-md bg-parchemin/50 p-3">
          <input type="hidden" name="tripId" value={tripId} />
          <Input
            name="question"
            placeholder={t("ideas.questionPlaceholder")}
            required
            maxLength={200}
          />
          <textarea
            name="options"
            rows={3}
            required
            placeholder={t("ideas.optionsPlaceholder")}
            className="rounded-md border border-laiton-clair bg-papier px-3 py-2 text-sm text-encre"
          />
          <p className="text-xs text-encre-douce">{t("ideas.optionsHint")}</p>
          <Button type="submit" size="sm" disabled={formPending}>
            {formPending ? t("ideas.opening") : t("ideas.launchPoll")}
          </Button>
          {state.status === "error" ? (
            <p className="text-xs text-bordeaux">{state.message}</p>
          ) : null}
        </form>
      ) : null}

      {polls.map((poll) => {
        const total = poll.votes.length;
        const myVote = poll.votes.find((v) => v.user_id === myId)?.option_index ?? null;
        const closed = poll.closed_at !== null;
        return (
          <article key={poll.id} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-encre">{poll.question}</p>
              <span className="flex items-center gap-2 text-xs text-encre-douce">
                {total} {total > 1 ? t("ideas.voteMany") : t("ideas.voteOne")}
                {closed ? ` · ${t("ideas.closed")}` : null}
                {!closed && (poll.created_by === myId || isOwner) ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => startTransition(() => closePoll(tripId, poll.id))}
                    className="underline underline-offset-4 hover:text-encre"
                  >
                    {t("ideas.close")}
                  </button>
                ) : null}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {poll.options.map((option, i) => {
                const count = poll.votes.filter((v) => v.option_index === i).length;
                const pct = total ? Math.round((count / total) * 100) : 0;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={closed || pending}
                    onClick={() => startTransition(() => votePoll(tripId, poll.id, i))}
                    className={cn(
                      "relative overflow-hidden rounded-md border px-3 py-1.5 text-left text-sm transition-colors",
                      myVote === i
                        ? "border-bordeaux text-encre"
                        : "border-laiton-clair text-encre-douce hover:text-encre",
                      closed && "cursor-default",
                    )}
                  >
                    <span
                      className="absolute inset-y-0 left-0 bg-bordeaux/10"
                      style={{ width: `${pct}%` }}
                      aria-hidden="true"
                    />
                    <span className="relative flex justify-between">
                      <span>
                        {option}
                        {myVote === i ? " ✓" : ""}
                      </span>
                      <span className="text-xs">
                        {count} · {pct}%
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </article>
        );
      })}
    </section>
  );
}
