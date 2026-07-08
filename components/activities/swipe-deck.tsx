"use client";

import { Check, Heart, RotateCcw, Star, X } from "lucide-react";
import { type PointerEvent, useRef, useState, useTransition } from "react";
import { castVote, undoVote } from "@/app/(app)/trips/[tripId]/activities/actions";
import { useT } from "@/components/i18n/provider";
import { dragRotation, dragVerdict, exitOffset, type Verdict } from "@/lib/activities/swipe";
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

/** Deck de swipe (PHIL-U04) : glisse ou boutons, verdict via `lib/activities/swipe`. */
export function SwipeDeck({ tripId, activities }: { tripId: string; activities: SwipeActivity[] }) {
  const t = useT();
  const [queue, setQueue] = useState(activities);
  const [history, setHistory] = useState<SwipeActivity[]>([]);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<Verdict | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [, startTransition] = useTransition();

  const top = queue[0];

  function commit(verdict: Verdict) {
    if (!top || exiting) {
      return;
    }
    setExiting(verdict);
    startTransition(() => castVote(tripId, top.id, verdict));
    window.setTimeout(() => {
      setHistory((h) => [top, ...h]);
      setQueue((q) => q.slice(1));
      setDrag({ x: 0, y: 0 });
      setExiting(null);
    }, 220);
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (exiting) {
      return;
    }
    start.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!start.current) {
      return;
    }
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
  }
  function onPointerUp() {
    if (!start.current) {
      return;
    }
    start.current = null;
    setDragging(false);
    const verdict = dragVerdict(drag.x, drag.y);
    if (verdict) {
      commit(verdict);
    } else {
      setDrag({ x: 0, y: 0 });
    }
  }

  function undo() {
    const last = history[0];
    if (!last) {
      return;
    }
    startTransition(() => undoVote(tripId, last.id));
    setHistory((h) => h.slice(1));
    setQueue((q) => [last, ...q]);
  }

  if (!top) {
    return (
      <p className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-4 py-10 text-center text-sm text-encre-douce">
        {t("activities.deckEmpty")}
      </p>
    );
  }

  const offset = exiting ? exitOffset(exiting) : drag;
  const rotation = dragRotation(offset.x);
  const preview = dragging ? dragVerdict(drag.x, drag.y) : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-96 w-full max-w-sm select-none">
        {queue[1] ? <ActivityCard activity={queue[1]} behind /> : null}
        <div
          className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
            transition: dragging ? "none" : "transform 0.22s ease-out",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <ActivityCard
            activity={top}
            preview={preview ? t(`activities.${VERDICT_KEY[preview]}`) : null}
            previewColor={preview ? VERDICT_COLOR[preview] : ""}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <VerdictButton
          onClick={() => commit("NO")}
          label={t("activities.no")}
          className="text-bordeaux"
        >
          <X aria-hidden="true" />
        </VerdictButton>
        <VerdictButton
          onClick={() => commit("MAYBE")}
          label={t("activities.maybe")}
          className="text-laiton"
        >
          <Check aria-hidden="true" />
        </VerdictButton>
        <VerdictButton
          onClick={() => commit("SUPER")}
          label={t("activities.super")}
          className="text-bleu-nuit"
        >
          <Star aria-hidden="true" />
        </VerdictButton>
        <VerdictButton
          onClick={() => commit("YES")}
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
        className="flex items-center gap-1.5 text-xs text-encre-douce underline-offset-4 hover:text-encre disabled:opacity-40 disabled:no-underline"
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
        {t("activities.undo")}
      </button>
      <p className="text-center text-xs text-encre-douce">{t("activities.swipeHint")}</p>
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
            "absolute right-4 top-4 rounded-md border-2 px-2 py-0.5 font-display text-lg uppercase",
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
