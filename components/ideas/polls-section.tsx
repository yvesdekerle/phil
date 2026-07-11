"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useActionState, useOptimistic, useState, useTransition } from "react";
import {
  closePoll,
  createPoll,
  deletePoll,
  editPoll,
  type PollState,
  votePoll,
} from "@/app/(app)/trips/[tripId]/ideas/poll-actions";
import { useLocale, useT } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type Poll = {
  id: string;
  question: string;
  options: string[];
  closed_at: string | null;
  /** PHIL-S03 : date de fin programmée (distincte de closed_at). */
  closes_at: string | null;
  /** PHIL-S03 : choix multiple autorisé. */
  allow_multiple: boolean;
  created_by: string;
  votes: { user_id: string; option_index: number }[];
};

/** Sondages éclair (PHIL-N12) : vote en un tap, votants visibles (PHIL-S03). */
export function PollsSection({
  tripId,
  polls,
  myId,
  isOwner,
  names,
}: {
  tripId: string;
  polls: Poll[];
  myId: string;
  isOwner: boolean;
  /** PHIL-S03 : id de participant → nom affiché. */
  names: Record<string, string>;
}) {
  const t = useT();
  const locale = useLocale();
  const [showForm, setShowForm] = useState(false);
  const [state, formAction, formPending] = useActionState<PollState, FormData>(createPoll, {
    status: "idle",
  });
  const [pending, startTransition] = useTransition();

  // PHIL-S03 : mise à jour optimiste — le vote s'affiche instantanément, sans
  // attendre l'aller-retour serveur (qui reconcilie ensuite via revalidatePath).
  const [optimisticPolls, applyVote] = useOptimistic(
    polls,
    (current: Poll[], action: { pollId: string; optionIndex: number }) =>
      current.map((p) => {
        if (p.id !== action.pollId) {
          return p;
        }
        const mine = p.votes.some(
          (v) => v.user_id === myId && v.option_index === action.optionIndex,
        );
        const votes = p.allow_multiple
          ? mine
            ? p.votes.filter((v) => !(v.user_id === myId && v.option_index === action.optionIndex))
            : [...p.votes, { user_id: myId, option_index: action.optionIndex }]
          : [
              ...p.votes.filter((v) => v.user_id !== myId),
              { user_id: myId, option_index: action.optionIndex },
            ];
        return { ...p, votes };
      }),
  );

  const vote = (pollId: string, optionIndex: number) => {
    startTransition(async () => {
      applyVote({ pollId, optionIndex });
      await votePoll(tripId, pollId, optionIndex);
    });
  };

  // PHIL-S06 : édition de la question / des libellés d'options (votes préservés).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const saveEdit = (pollId: string, question: string, options: string[]) => {
    startTransition(async () => {
      const res = await editPoll(tripId, pollId, question, options);
      if (res.status === "error") {
        setEditError(res.message ?? null);
        return;
      }
      setEditError(null);
      setEditingId(null);
    });
  };

  const nameOf = (userId: string) => names[userId] ?? t("ideas.pollVoterFallback");
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(locale);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-heading text-ink">{t("ideas.pollSectionTitle")}</h2>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? t("ideas.cancel") : t("ideas.new")}
        </Button>
      </div>

      {showForm ? (
        <form
          action={formAction}
          className="flex flex-col gap-2 rounded-lg border border-line bg-sand/50 p-3"
        >
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
            className="rounded-md border border-line bg-card px-3 py-2 text-sm text-ink"
          />
          <p className="text-xs text-slate">{t("ideas.optionsHint")}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="allowMultiple" className="size-4 accent-lagoon-ink" />
              {t("ideas.pollAllowMultiple")}
            </label>
            <div className="flex items-center gap-2 text-sm text-slate">
              <label htmlFor="poll-closes-at">{t("ideas.pollClosesLabel")}</label>
              <Input id="poll-closes-at" name="closesAt" type="date" className="h-8 w-40 text-sm" />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={formPending}>
            {formPending ? t("ideas.opening") : t("ideas.launchPoll")}
          </Button>
          {state.status === "error" ? (
            <p className="text-caption text-berry-ink">{state.message}</p>
          ) : null}
        </form>
      ) : null}

      {optimisticPolls.length === 0 && !showForm ? (
        <p className="rounded-lg border border-dashed border-line bg-card/60 px-4 py-8 text-center text-sm text-slate">
          {t("ideas.pollsEmpty")}
        </p>
      ) : null}

      {optimisticPolls.map((poll) => {
        const myVotes = poll.votes.filter((v) => v.user_id === myId).map((v) => v.option_index);
        const voters = new Set(poll.votes.map((v) => v.user_id)).size;
        const endPast = poll.closes_at ? new Date(poll.closes_at) < new Date() : false;
        const closed = poll.closed_at !== null || endPast;
        const canManage = poll.created_by === myId || isOwner;
        return (
          <article
            key={poll.id}
            className="flex flex-col gap-1.5 rounded-lg border border-line bg-card px-4 py-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-subhead text-ink">{poll.question}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption text-ghost">
                  <span>
                    {voters} {voters > 1 ? t("ideas.voteMany") : t("ideas.voteOne")}
                  </span>
                  {poll.allow_multiple ? (
                    <span className="rounded-sm bg-wash px-1.5 py-0.5 font-mono text-label text-slate uppercase">
                      {t("ideas.pollAllowMultiple")}
                    </span>
                  ) : null}
                  {closed ? (
                    <span>· {endPast ? t("ideas.pollEnded") : t("ideas.closed")}</span>
                  ) : poll.closes_at ? (
                    <span>
                      · {t("ideas.pollClosesOn")} {fmtDate(poll.closes_at)}
                    </span>
                  ) : null}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-2 text-xs text-slate">
                {!closed && canManage ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => startTransition(() => closePoll(tripId, poll.id))}
                    className="underline underline-offset-4 hover:text-ink"
                  >
                    {t("ideas.close")}
                  </button>
                ) : null}
                {canManage ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setEditError(null);
                      setEditingId(editingId === poll.id ? null : poll.id);
                    }}
                    className="text-slate transition-colors hover:text-ink"
                    aria-label={t("ideas.pollEdit")}
                    title={t("ideas.pollEdit")}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </button>
                ) : null}
                {canManage ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => startTransition(() => deletePoll(tripId, poll.id))}
                    className="text-slate transition-colors hover:text-berry-ink"
                    aria-label={t("ideas.pollDelete")}
                    title={t("ideas.pollDelete")}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </span>
            </div>
            {editingId === poll.id ? (
              <PollEditForm
                poll={poll}
                pending={pending}
                error={editError}
                onCancel={() => {
                  setEditingId(null);
                  setEditError(null);
                }}
                onSave={(question, options) => saveEdit(poll.id, question, options)}
              />
            ) : (
              <div className="flex flex-col gap-1.5">
                {poll.options.map((option, i) => {
                  const optionVotes = poll.votes.filter((v) => v.option_index === i);
                  const count = optionVotes.length;
                  const pct = voters ? Math.round((count / voters) * 100) : 0;
                  const mine = myVotes.includes(i);
                  return (
                    <div key={option} className="flex flex-col gap-0.5">
                      {/* L5a — option : rond 50 % (réservé au vote simple des
                          sondages), sélection lagoon-wash + bordure lagoon-soft,
                          piste de résultat sous le libellé. */}
                      <button
                        type="button"
                        disabled={closed}
                        onClick={() => vote(poll.id, i)}
                        aria-pressed={mine}
                        className={cn(
                          "flex flex-col gap-1.5 rounded-lg border p-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand",
                          mine
                            ? "border-[1.5px] border-lagoon-soft bg-lagoon-wash"
                            : "border-line bg-card hover:bg-wash",
                          closed && "cursor-default",
                        )}
                      >
                        <span className="flex w-full items-center gap-2.5">
                          <span
                            aria-hidden="true"
                            className={cn(
                              "flex size-4.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                              mine ? "bg-lagoon text-white" : "border-[1.5px] border-ghost",
                            )}
                          >
                            {mine ? "✓" : ""}
                          </span>
                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate text-body text-ink",
                              mine ? "font-bold" : "font-semibold",
                            )}
                          >
                            {option}
                          </span>
                          <span className="shrink-0 font-mono text-caption font-bold text-ink tabular-nums">
                            {count}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "block h-2 w-full overflow-hidden rounded-[4px]",
                            mine ? "bg-white" : "bg-wash",
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "block h-full rounded-[4px]",
                              mine ? "bg-lagoon" : "bg-ghost",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                      </button>
                      {count > 0 ? (
                        <p className="px-1 text-caption text-slate">
                          {optionVotes.map((v) => nameOf(v.user_id)).join(", ")}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

/** Formulaire d'édition d'un sondage (PHIL-S06) : question + libellés d'options. */
function PollEditForm({
  poll,
  pending,
  error,
  onCancel,
  onSave,
}: {
  poll: Poll;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (question: string, options: string[]) => void;
}) {
  const t = useT();
  const [question, setQuestion] = useState(poll.question);
  const [optionsText, setOptionsText] = useState(poll.options.join("\n"));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(
          question,
          optionsText.split("\n").map((o) => o.trim()),
        );
      }}
      className="flex flex-col gap-2 rounded-md border border-line bg-sand/40 p-2.5"
    >
      <Input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        maxLength={200}
        required
        aria-label={t("ideas.questionPlaceholder")}
      />
      <textarea
        value={optionsText}
        onChange={(e) => setOptionsText(e.target.value)}
        rows={Math.max(2, poll.options.length)}
        required
        className="rounded-md border border-line bg-card px-3 py-2 text-sm text-ink"
        aria-label={t("ideas.optionsPlaceholder")}
      />
      <p className="text-xs text-slate">{t("ideas.pollEditHint")}</p>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {t("ideas.pollEditSave")}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={pending}>
          {t("ideas.cancel")}
        </Button>
      </div>
      {error ? <p className="text-caption text-berry-ink">{error}</p> : null}
    </form>
  );
}
