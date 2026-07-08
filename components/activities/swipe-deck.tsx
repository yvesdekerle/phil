"use client";

import { Check, Heart, RotateCcw, Star, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { castVote, undoVote } from "@/app/(app)/trips/[tripId]/activities/actions";
import { useT } from "@/components/i18n/provider";
import { dragRotation, exitOffset, type Verdict } from "@/lib/activities/swipe";
import { useSwipeGesture } from "@/lib/activities/use-swipe-gesture";
import { cn } from "@/lib/utils";
import { ActivityDetailModal } from "./activity-detail-modal";
import { DragFeedback, type DragFeedbackHandle, Stamp, SuperLikeFX } from "./swipe-feedback";

export type SwipeActivity = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  tags: string[];
  photoUrls: string[];
  priceText: string | null;
  durationText: string | null;
};

type Exit = { activity: SwipeActivity; from: { x: number; y: number }; verdict: Verdict };

/** Deck de swipe (PHIL-U04) : geste rAF fluide (porté de Yallah) + boutons. */
export function SwipeDeck({ tripId, activities }: { tripId: string; activities: SwipeActivity[] }) {
  const t = useT();
  const [queue, setQueue] = useState(activities);
  const [history, setHistory] = useState<SwipeActivity[]>([]);
  const [exit, setExit] = useState<Exit | null>(null);
  const [superFx, setSuperFx] = useState(false);
  const [detail, setDetail] = useState<SwipeActivity | null>(null);
  const feedbackRef = useRef<DragFeedbackHandle>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const labels = useMemo<Record<Verdict, string>>(
    () => ({
      YES: t("activities.yes"),
      NO: t("activities.no"),
      MAYBE: t("activities.maybe"),
      SUPER: t("activities.super"),
    }),
    [t],
  );

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
    onTap: () => {
      if (top) {
        setDetail(top);
      }
    },
    onDragMove: (x, y) => feedbackRef.current?.update(x, y),
    onDragEnd: () => feedbackRef.current?.clear(),
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
            <ActivityCard activity={top} />
          </div>
        ) : null}
        {top && !exit ? <DragFeedback ref={feedbackRef} labels={labels} /> : null}
        {exit ? <ExitCard exit={exit} label={labels[exit.verdict]} /> : null}
        {superFx ? <SuperLikeFX label={t("activities.super")} /> : null}
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
      <p className="text-center text-xs text-encre-douce/70">{t("activities.detailHint")}</p>

      {detail ? <ActivityDetailModal activity={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}

/** Carte sortante, animée hors-écran depuis la position de relâchement, tampon inclus. */
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
      <ActivityCard activity={exit.activity} />
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
        "flex size-12 items-center justify-center rounded-full border border-laiton-clair bg-papier shadow-sm transition-transform hover:scale-110",
        className,
      )}
    >
      {children}
    </button>
  );
}

function ActivityCard({ activity, behind }: { activity: SwipeActivity; behind?: boolean }) {
  const photo = activity.photoUrls[0];
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col justify-end overflow-hidden rounded-2xl border border-laiton-clair p-5 shadow-lg",
        photo ? "bg-encre bg-cover bg-center" : "bg-gradient-to-br from-parchemin to-papier",
        behind && "scale-95 opacity-60",
      )}
      style={photo ? { backgroundImage: `url(${photo})` } : undefined}
    >
      {photo ? (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-encre/85 via-encre/25 to-transparent" />
      ) : null}
      <div className="relative">
        {activity.category ? (
          <span
            className={cn(
              "mb-1 block text-xs uppercase tracking-wide",
              photo ? "text-laiton-clair" : "text-laiton",
            )}
          >
            {activity.category}
          </span>
        ) : null}
        <h3 className={cn("font-display text-2xl", photo ? "text-papier" : "text-encre")}>
          {activity.title}
        </h3>
        {activity.location ? (
          <p className={cn("mt-0.5 text-sm", photo ? "text-papier/80" : "text-encre-douce")}>
            📍 {activity.location}
          </p>
        ) : null}
        {activity.description ? (
          <p
            className={cn(
              "mt-2 line-clamp-3 text-sm",
              photo ? "text-papier/85" : "text-encre-douce",
            )}
          >
            {activity.description}
          </p>
        ) : null}
        {activity.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {activity.tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  photo ? "bg-papier/20 text-papier" : "bg-laiton/15 text-laiton",
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
