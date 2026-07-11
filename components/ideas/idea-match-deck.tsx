"use client";

import { Check, Heart, RotateCcw, Star, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { castIdeaVerdict, undoIdeaVerdict } from "@/app/(app)/trips/[tripId]/ideas/actions";
import {
  DragFeedback,
  type DragFeedbackHandle,
  Stamp,
  SuperLikeFX,
} from "@/components/activities/swipe-feedback";
import { useT } from "@/components/i18n/provider";
import { dragRotation, exitOffset, type Verdict } from "@/lib/activities/swipe";
import { useSwipeGesture } from "@/lib/activities/use-swipe-gesture";
import { cn } from "@/lib/utils";

export type SwipeIdea = {
  id: string;
  title: string;
  description: string | null;
  locationName: string | null;
  tags: string[];
  estimatedCost: number | null;
  costCurrency: string | null;
  durationMinutes: number | null;
};

type Exit = { idea: SwipeIdea; from: { x: number; y: number }; verdict: Verdict };

/**
 * Deck « Match tes activités » (PHIL-U07) — le swipe façon Tinder/Bumble sur les
 * IDÉES du voyage. Réutilise la mécanique générique de U04 (geste rAF fluide,
 * tampons/teinte, flourish super like) ; seul le vote change (`idea_votes`).
 */
export function IdeaMatchDeck({ tripId, ideas }: { tripId: string; ideas: SwipeIdea[] }) {
  const t = useT();
  const [queue, setQueue] = useState(ideas);
  const [history, setHistory] = useState<SwipeIdea[]>([]);
  const [exit, setExit] = useState<Exit | null>(null);
  const [superFx, setSuperFx] = useState(false);
  const feedbackRef = useRef<DragFeedbackHandle>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const labels = useMemo<Record<Verdict, string>>(
    () => ({
      YES: t("ideas.match.yes"),
      NO: t("ideas.match.no"),
      MAYBE: t("ideas.match.maybe"),
      SUPER: t("ideas.match.super"),
    }),
    [t],
  );

  const top = queue[0];

  function commit(verdict: Verdict, from: { x: number; y: number }) {
    const card = queue[0];
    if (!card || exit) {
      return;
    }
    startTransition(() => castIdeaVerdict(tripId, card.id, verdict));
    setHistory((h) => [card, ...h]);
    setQueue((q) => q.slice(1));
    setExit({ idea: card, from, verdict });
    feedbackRef.current?.clear();
    if (verdict === "SUPER") {
      setSuperFx(true);
      window.setTimeout(() => setSuperFx(false), 750);
    }
    window.setTimeout(() => setExit(null), 340);
  }

  const gesture = useSwipeGesture({
    disabled: !!exit || !top,
    cardRef,
    onSwipe: (verdict, from) => commit(verdict, from),
    onDragMove: (x, y) => feedbackRef.current?.update(x, y),
    onDragEnd: () => feedbackRef.current?.clear(),
  });

  function undo() {
    const last = history[0];
    if (!last) {
      return;
    }
    startTransition(() => undoIdeaVerdict(tripId, last.id));
    setHistory((h) => h.slice(1));
    setQueue((q) => [last, ...q]);
  }

  if (!top && !exit) {
    return (
      <p className="rounded-lg border border-dashed border-line bg-card/60 px-4 py-10 text-center text-sm text-slate">
        {t("ideas.match.deckEmpty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-[58vh] max-h-[32rem] min-h-80 w-full max-w-sm select-none sm:h-96">
        {queue[1] ? <IdeaCardFace idea={queue[1]} behind /> : null}
        {top ? (
          <div
            key={top.id}
            ref={cardRef}
            className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
            onPointerDown={gesture.onPointerDown}
            onPointerMove={gesture.onPointerMove}
            onPointerUp={gesture.onPointerUp}
            onPointerCancel={gesture.onPointerCancel}
          >
            <IdeaCardFace idea={top} />
          </div>
        ) : null}
        {top && !exit ? <DragFeedback ref={feedbackRef} labels={labels} /> : null}
        {exit ? <ExitCard exit={exit} label={labels[exit.verdict]} /> : null}
        {superFx ? <SuperLikeFX label={t("ideas.match.super")} /> : null}
      </div>

      <div className="flex items-center gap-3">
        <VerdictButton
          onClick={() => commit("NO", { x: 0, y: 0 })}
          label={t("ideas.match.no")}
          className="text-lagoon-ink"
        >
          <X aria-hidden="true" />
        </VerdictButton>
        <VerdictButton
          onClick={() => commit("MAYBE", { x: 0, y: 0 })}
          label={t("ideas.match.maybe")}
          className="text-mist"
        >
          <Check aria-hidden="true" />
        </VerdictButton>
        <VerdictButton
          onClick={() => commit("SUPER", { x: 0, y: 0 })}
          label={t("ideas.match.super")}
          className="text-ink-deep"
        >
          <Star aria-hidden="true" />
        </VerdictButton>
        <VerdictButton
          onClick={() => commit("YES", { x: 0, y: 0 })}
          label={t("ideas.match.yes")}
          className="text-lagoon"
        >
          <Heart aria-hidden="true" />
        </VerdictButton>
      </div>

      <button
        type="button"
        onClick={undo}
        disabled={history.length === 0}
        className="flex items-center gap-1.5 text-xs text-slate underline-offset-4 hover:text-ink disabled:no-underline disabled:opacity-40"
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
        {t("ideas.match.undo")}
      </button>
      <p className="text-center text-xs text-slate">{t("ideas.match.hint")}</p>
    </div>
  );
}

/** Carte sortante, animée hors-écran, tampon inclus. */
function ExitCard({ exit, label }: { exit: Exit; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const to = exitOffset(exit.verdict);
    const id = requestAnimationFrame(() => {
      node.style.transition = "transform 0.32s ease-out, opacity 0.32s ease-out";
      node.style.transform = `translate3d(${to.x}px, ${to.y}px, 0) rotate(${dragRotation(to.x)}deg)`;
      node.style.opacity = "0";
    });
    return () => cancelAnimationFrame(id);
  }, [exit]);

  return (
    <div
      ref={ref}
      className="absolute inset-0 z-10"
      style={{
        transform: `translate3d(${exit.from.x}px, ${exit.from.y}px, 0) rotate(${dragRotation(exit.from.x)}deg)`,
      }}
    >
      <IdeaCardFace idea={exit.idea} />
      <Stamp verdict={exit.verdict} intensity={1} label={label} />
    </div>
  );
}

function VerdictButton({
  onClick,
  label,
  className,
  children,
}: {
  onClick: () => void;
  label: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-12 items-center justify-center rounded-full border border-line bg-card shadow-sm transition-transform hover:scale-110",
        className,
      )}
    >
      {children}
    </button>
  );
}

function IdeaCardFace({ idea, behind }: { idea: SwipeIdea; behind?: boolean }) {
  const meta = [
    idea.durationMinutes ? `⏱ ${idea.durationMinutes} min` : null,
    idea.estimatedCost ? `💶 ${idea.estimatedCost} ${idea.costCurrency ?? "EUR"}` : null,
  ].filter(Boolean);
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col justify-end overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-sand to-card p-5 shadow-lg",
        behind && "scale-95 opacity-60",
      )}
    >
      <h3 className="font-sans text-2xl text-ink">{idea.title}</h3>
      {idea.locationName ? (
        <p className="mt-0.5 text-sm text-slate">📍 {idea.locationName}</p>
      ) : null}
      {idea.description ? (
        <p className="mt-2 line-clamp-3 text-sm text-slate">{idea.description}</p>
      ) : null}
      {meta.length > 0 ? <p className="mt-2 text-xs text-slate">{meta.join("  ·  ")}</p> : null}
      {idea.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {idea.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-citron/15 px-2 py-0.5 text-xs text-mist">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
