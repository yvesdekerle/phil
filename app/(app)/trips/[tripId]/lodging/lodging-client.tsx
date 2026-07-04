"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, ExternalLink, Trash2 } from "lucide-react";
import { useActionState, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  addCandidate,
  type CandidateState,
  chooseCandidate,
  clearCandidateVote,
  deleteCandidate,
  rateCandidate,
  setCandidateStatus,
} from "./actions";

export type Candidate = {
  id: string;
  title: string;
  url: string | null;
  price: string | null;
  notes: string | null;
  checkIn: string;
  checkOut: string;
  status: "OPEN" | "CHOSEN" | "REJECTED";
  createdBy: string;
  authorName: string;
};

export type CandidateVote = {
  candidateId: string;
  userId: string;
  rating: number;
  comment: string | null;
  name: string;
};

const RATING_LABELS: Record<number, string> = {
  2: "Vaut le coup",
  1: "Optionnel",
  [-1]: "Plutôt non",
};

/** Avis pondérés d'un candidat (PHIL-L02) : score, mes boutons, avis des autres. */
function CandidateVotes({
  tripId,
  candidateId,
  votes,
  myId,
}: {
  tripId: string;
  candidateId: string;
  votes: CandidateVote[];
  myId: string;
}) {
  const [, voteAction] = useActionState<CandidateState, FormData>(rateCandidate, {
    status: "idle",
  });
  const [pending, startTransition] = useTransition();
  const myVote = votes.find((v) => v.userId === myId);
  const score = votes.reduce((s, v) => s + v.rating, 0);

  return (
    <div className="mt-2 border-t border-laiton-clair/40 pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
            score > 0 ? "bg-bordeaux/10 text-bordeaux" : "bg-encre/10 text-encre-douce",
          )}
          title={`${votes.length} avis`}
        >
          Score {score > 0 ? `+${score}` : score} · {votes.length} avis
        </span>
        <form action={voteAction} className="flex flex-wrap items-center gap-1.5">
          <input type="hidden" name="tripId" value={tripId} />
          <input type="hidden" name="candidateId" value={candidateId} />
          {[2, 1, -1].map((rating) => (
            <button
              key={rating}
              type="submit"
              name="rating"
              value={rating}
              disabled={pending}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                myVote?.rating === rating
                  ? "border-bordeaux bg-bordeaux text-papier"
                  : "border-laiton-clair text-encre-douce hover:text-encre",
              )}
            >
              {RATING_LABELS[rating]}
            </button>
          ))}
          <Input
            name="comment"
            placeholder="Un mot ? (optionnel)"
            maxLength={300}
            defaultValue={myVote?.comment ?? ""}
            className="h-7 w-44 text-xs"
          />
          {myVote ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => clearCandidateVote(tripId, candidateId))}
              className="text-xs text-encre-douce underline underline-offset-2 hover:text-encre"
            >
              retirer
            </button>
          ) : null}
        </form>
      </div>
      {votes.some((v) => v.comment || v.userId !== myId) ? (
        <ul className="mt-1.5 flex flex-col gap-0.5">
          {votes.map((v) => (
            <li key={v.userId} className="text-xs text-encre-douce">
              <span className="font-medium text-encre">{v.userId === myId ? "Toi" : v.name}</span> —{" "}
              {RATING_LABELS[v.rating] ?? v.rating}
              {v.comment ? ` · « ${v.comment} »` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function slotLabel(checkIn: string, checkOut: string): string {
  const inLabel = format(new Date(`${checkIn}T12:00:00`), "d MMM", { locale: fr });
  const outLabel = format(new Date(`${checkOut}T12:00:00`), "d MMM yyyy", { locale: fr });
  return `Du ${inLabel} au ${outLabel}`;
}

/** Hébergements candidats (PHIL-L01) : options groupées par créneau. */
export function LodgingClient({
  tripId,
  candidates,
  votes,
  myId,
  role,
}: {
  tripId: string;
  candidates: Candidate[];
  votes: CandidateVote[];
  myId: string;
  role: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<CandidateState, FormData>(
    async (prev, formData) => {
      const result = await addCandidate(prev, formData);
      if (result.status === "idle") {
        formRef.current?.reset();
        setShowForm(false);
      }
      return result;
    },
    { status: "idle" },
  );
  const [pending, startTransition] = useTransition();

  const canDecide = role === "OWNER" || role === "EDITOR";
  const isOwner = role === "OWNER";

  const slots = [...new Set(candidates.map((c) => `${c.checkIn}|${c.checkOut}`))];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button type="button" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Annuler" : "Proposer une option"}
        </Button>
      </div>

      {showForm ? (
        <form
          ref={formRef}
          action={formAction}
          className="flex flex-col gap-3 rounded-lg border border-laiton-clair bg-papier px-4 py-3"
        >
          <input type="hidden" name="tripId" value={tripId} />
          <Input name="title" placeholder="Nom de l'hébergement" required maxLength={150} />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 text-xs text-encre-douce">
              <label htmlFor="candidate-check-in">Arrivée</label>
              <Input id="candidate-check-in" name="checkIn" type="date" required />
            </div>
            <div className="flex flex-col gap-1 text-xs text-encre-douce">
              <label htmlFor="candidate-check-out">Départ</label>
              <Input id="candidate-check-out" name="checkOut" type="date" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input name="url" type="url" placeholder="Lien Booking/Airbnb…" />
            <Input name="price" placeholder="Prix (ex : 620 € les 3 nuits)" maxLength={100} />
          </div>
          <Input
            name="notes"
            placeholder="Annulation gratuite, à 10 min de la plage…"
            maxLength={1000}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm">
              Ajouter au comparatif
            </Button>
            {state.status === "error" ? (
              <p className="text-xs text-bordeaux">{state.message}</p>
            ) : null}
          </div>
        </form>
      ) : null}

      {candidates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-6 py-14 text-center">
          <p className="font-display text-xl text-encre italic">Aucune option en lice</p>
          <p className="mt-2 text-sm text-encre-douce">
            Trois Booking ouverts dans trois onglets ? Range-les ici et départagez-les.
          </p>
        </div>
      ) : (
        slots.map((slot) => {
          const [checkIn, checkOut] = slot.split("|");
          const slotCandidates = candidates.filter(
            (c) => c.checkIn === checkIn && c.checkOut === checkOut,
          );
          return (
            <section key={slot}>
              <h2 className="mb-2 text-sm font-medium text-laiton uppercase tracking-wide">
                {slotLabel(checkIn, checkOut)}
              </h2>
              <ul className="flex flex-col gap-2">
                {slotCandidates.map((c) => (
                  <li
                    key={c.id}
                    className={cn(
                      "rounded-lg border bg-papier px-4 py-3",
                      c.status === "CHOSEN"
                        ? "border-bordeaux/50 bg-bordeaux/5"
                        : c.status === "REJECTED"
                          ? "border-laiton-clair/50 opacity-60"
                          : "border-laiton-clair",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 flex-1 text-sm font-medium text-encre">
                        {c.title}
                        {c.status === "CHOSEN" ? (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-bordeaux px-2 py-0.5 text-[0.65rem] text-papier">
                            <CheckCircle2 className="size-3" aria-hidden="true" /> Retenu
                          </span>
                        ) : null}
                        {c.status === "REJECTED" ? (
                          <span className="ml-2 rounded-full bg-encre/10 px-2 py-0.5 text-[0.65rem] text-encre-douce">
                            Écarté
                          </span>
                        ) : null}
                      </span>
                      {c.price ? (
                        <span className="shrink-0 text-sm text-encre tabular-nums">{c.price}</span>
                      ) : null}
                      {c.url ? (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-encre-douce hover:text-encre"
                          aria-label={`Ouvrir le lien de ${c.title}`}
                        >
                          <ExternalLink className="size-4" aria-hidden="true" />
                        </a>
                      ) : null}
                    </div>
                    {c.notes ? <p className="mt-1 text-xs text-encre-douce">{c.notes}</p> : null}
                    <CandidateVotes
                      tripId={tripId}
                      candidateId={c.id}
                      votes={votes.filter((v) => v.candidateId === c.id)}
                      myId={myId}
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-[0.65rem] text-encre-douce/70">
                        proposé par {c.createdBy === myId ? "toi" : c.authorName}
                      </span>
                      <span className="flex-1" />
                      {canDecide && c.status === "OPEN" ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            disabled={pending}
                            onClick={() => startTransition(() => chooseCandidate(tripId, c.id))}
                          >
                            Choisir → calendrier
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={pending}
                            onClick={() =>
                              startTransition(() => setCandidateStatus(tripId, c.id, "REJECTED"))
                            }
                          >
                            Écarter
                          </Button>
                        </>
                      ) : null}
                      {canDecide && c.status === "REJECTED" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() =>
                            startTransition(() => setCandidateStatus(tripId, c.id, "OPEN"))
                          }
                        >
                          Remettre en lice
                        </Button>
                      ) : null}
                      {(c.createdBy === myId || isOwner) && c.status !== "CHOSEN" ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => startTransition(() => deleteCandidate(tripId, c.id))}
                          className="text-encre-douce hover:text-bordeaux"
                          aria-label={`Supprimer ${c.title}`}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
