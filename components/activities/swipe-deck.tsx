"use client";

import { Check, Heart, RotateCcw, Star, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { castVote, undoVote } from "@/app/(app)/trips/[tripId]/activities/actions";
import { useT } from "@/components/i18n/provider";
import { dragRotation, exitOffset, type Verdict } from "@/lib/activities/swipe";
import { useSwipeGesture } from "@/lib/activities/use-swipe-gesture";
import { cn } from "@/lib/utils";

export type SwipeActivity = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  tags: string[];
};

const VERDICT_KEY: Record<Verdict, "yes" | "no" | "maybe" | "super"> = {
  YES: "yes",
  NO: "no",
  MAYBE: "maybe",
  SUPER: "super",
};
const VERDICT_COLOR: Record<Verdict, string> = {
  YES: "text-vert",
  NO: "text-bordeaux",
  MAYBE: "text-laiton",
  SUPER: "text-bleu-nuit",
};

type Exit = { activity: SwipeActivity; from: { x: number; y: number }; verdict: Verdict };

/** Deck de swipe (PHIL-U04) : geste rAF fluide (porté de Yallah) + boutons. */
export function SwipeDeck({ tripId, activities }: { tripId: string; activities: SwipeActivity[] }) {
  const t = useT();
  const [queue, setQueue] = useState(activities);
  const [history, setHistory] = useState<SwipeActivity[]>([]);
  const [exit, setExit] = useState<Exit | null>(null);
  const [feedback, setFeedback] = useState<Verdict | null>(null);
  const lastFeedback = useRef<Verdict | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const top = queue[0];

  function commit(verdict: Verdict, from: { x: number; y: number }) {
    const card = queue[0];
    if (!card || exit) {
      return;
    }
    startTransition(() => castVote(tripId, card.id, verdict));
    setHistory((h) => [card, ...h]);
    setQueue((q) => q.slice(1));
    setExit({ activity: card, from, verdict });
    lastFeedback.current = null;
    setFeedback(null);
    window.setTimeout(() => setExit(null), 340);
  }

  const gesture = useSwipeGesture({
    disabled: !!exit || !top,
    cardRef,
    onSwipe: (verdict, from) => commit(verdict, from),
    onDragMove: (x, y) => {
      // Throttle React : ne re-render que quand la CATÉGORIE de verdict change
      // (le transform de la carte, lui, reste impératif dans le hook → fluide).
      const v = dragVerdictCategory(x, y);
      if (v !== lastFeedback.current) {
        lastFeedback.current = v;
        setFeedback(v);
      }
    },
    onDragEnd: () => {
      lastFeedback.current = null;
      setFeedback(null);
    },
  });

  function undo() {
    const last = history[0];
    if (!last) {
      return;
    }
    startTransition(() => undoVote(tripId, last.id));
    setHistory((h) => h.slice(1));
    setQueue((q) => [last, ...q]);
  }

  if (!top && !exit) {
    return (
      <p className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-4 py-10 text-center text-sm text-encre-douce">
        {t("activities.deckEmpty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-96 w-full max-w-sm select-none">
        {queue[1] ? <ActivityCard activity={queue[1]} behind /> : null}
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
            <ActivityCard
              activity={top}
              preview={feedback ? t(`activities.${VERDICT_KEY[feedback]}`) : null}
              previewColor={feedback ? VERDICT_COLOR[feedback] : ""}
            />
          </div>
        ) : null}
        {exit ? <ExitCard exit={exit} /> : null}
      </div>

      <div className="flex items-center gap-3">
        <VerdictButton
          onClick={() => commit("NO", { x: 0, y: 0 })}
          label={t("activities.no")}
          className="text-bordeaux"
        >
          <X aria-hidden="true" />
        </VerdictButton>
        <VerdictButton
          onClick={() => commit("MAYBE", { x: 0, y: 0 })}
          label={t("activities.maybe")}
          className="text-laiton"
        >
          <Check aria-hidden="true" />
        </VerdictButton>
        <VerdictButton
          onClick={() => commit("SUPER", { x: 0, y: 0 })}
          label={t("activities.super")}
          className="text-bleu-nuit"
        >
          <Star aria-hidden="true" />
        </VerdictButton>
        <VerdictButton
          onClick={() => commit("YES", { x: 0, y: 0 })}
          label={t("activities.yes")}
          className="text-vert"
        >
          <Heart aria-hidden="true" />
        </VerdictButton>
      </div>

      <button
        type="button"
        onClick={undo}
        disabled={history.length === 0}
        className="flex items-center gap-1.5 text-xs text-encre-douce underline-offset-4 hover:text-encre disabled:no-underline disabled:opacity-40"
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
        {t("activities.undo")}
      </button>
      <p className="text-center text-xs text-encre-douce">{t("activities.swipeHint")}</p>
    </div>
  );
}

/** Catégorie de verdict pour l'aperçu (même logique que dragVerdict, sans le seuil bas). */
function dragVerdictCategory(x: number, y: number): Verdict | null {
  if (Math.abs(x) < 12 && Math.abs(y) < 12) {
    return null;
  }
  const horizontal = Math.abs(x) > Math.abs(y) * 0.7;
  if (horizontal) {
    return x > 0 ? "YES" : "NO";
  }
  return y < 0 ? "SUPER" : "MAYBE";
}

/** Carte sortante, animée hors-écran depuis la position de relâchement. */
function ExitCard({ exit }: { exit: Exit }) {
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
      <ActivityCard activity={exit.activity} />
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
        "flex size-12 items-center justify-center rounded-full border border-laiton-clair bg-papier shadow-sm transition-transform hover:scale-110",
        className,
      )}
    >
      {children}
    </button>
  );
}

function ActivityCard({
  activity,
  behind,
  preview,
  previewColor,
}: {
  activity: SwipeActivity;
  behind?: boolean;
  preview?: string | null;
  previewColor?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col justify-end overflow-hidden rounded-2xl border border-laiton-clair bg-gradient-to-br from-parchemin to-papier p-5 shadow-lg",
        behind && "scale-95 opacity-60",
      )}
    >
      {preview ? (
        <span
          className={cn(
            "absolute top-4 right-4 rounded-md border-2 px-2 py-0.5 font-display text-lg uppercase",
            previewColor,
          )}
        >
          {preview}
        </span>
      ) : null}
      {activity.category ? (
        <span className="mb-1 text-xs uppercase tracking-wide text-laiton">
          {activity.category}
        </span>
      ) : null}
      <h3 className="font-display text-2xl text-encre">{activity.title}</h3>
      {activity.location ? (
        <p className="mt-0.5 text-sm text-encre-douce">📍 {activity.location}</p>
      ) : null}
      {activity.description ? (
        <p className="mt-2 line-clamp-3 text-sm text-encre-douce">{activity.description}</p>
      ) : null}
      {activity.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {activity.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-laiton/15 px-2 py-0.5 text-xs text-laiton">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
