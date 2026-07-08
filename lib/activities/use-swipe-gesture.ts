import { type PointerEvent as ReactPointerEvent, type RefObject, useEffect, useRef } from "react";
import { dragRotation, dragVerdict, TAP_MAX_DIST, TAP_MAX_MS, type Verdict } from "./swipe";

/**
 * Geste de swipe haute-fréquence (PHIL-U04 Phase 2), porté depuis Yallah
 * (`src/hooks/useSwipeGesture.ts` — « Yallah était fluide, autant reprendre »).
 *
 * La partie haute-fréquence — le transform de la carte — est écrite
 * **impérativement** dans le DOM à l'intérieur d'un `requestAnimationFrame`
 * (les rafales de `pointermove` sont coalescées en une écriture par frame,
 * `translate3d` + `will-change` pour compositer sur le GPU). L'état React n'est
 * jamais touché pendant le drag → le stack de cartes ne se re-render pas par
 * frame (c'est ce qui tue le stutter du drag). Le verdict est résolu au
 * `pointerup` depuis la position courante — même comportement que la logique pure.
 */

type PointerHandler = (e: ReactPointerEvent<HTMLDivElement>) => void;

export interface SwipeGesture {
  onPointerDown: PointerHandler;
  onPointerMove: PointerHandler;
  onPointerUp: PointerHandler;
  onPointerCancel: PointerHandler;
}

/** Transition de repos, alignée sur le snap-back pour un retour fluide au centre. */
const REST_TRANSITION = "transform 0.35s cubic-bezier(.2,.7,.3,1)";

export function useSwipeGesture({
  disabled,
  cardRef,
  onSwipe,
  onTap,
  onDragMove,
  onDragEnd,
}: {
  disabled: boolean;
  cardRef: RefObject<HTMLDivElement | null>;
  onSwipe: (verdict: Verdict, from: { x: number; y: number }) => void;
  onTap?: () => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: () => void;
}): SwipeGesture {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const tapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const now = () => (typeof performance !== "undefined" ? performance.now() : 0);

  const applyFrame = () => {
    rafRef.current = null;
    const { x, y } = offsetRef.current;
    const node = cardRef.current;
    if (node) {
      node.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${dragRotation(x)}deg)`;
    }
    onDragMove?.(x, y);
  };

  const scheduleFrame = () => {
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(applyFrame);
    }
  };

  const cancelFrame = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const onPointerDown: PointerHandler = (e) => {
    if (disabled) {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
    tapRef.current = { time: now(), x: e.clientX, y: e.clientY };
    offsetRef.current = { x: 0, y: 0 };
    draggingRef.current = true;
    const node = cardRef.current;
    if (node) {
      node.style.willChange = "transform";
      node.style.transition = "none";
      node.style.cursor = "grabbing";
    }
  };

  const onPointerMove: PointerHandler = (e) => {
    if (!draggingRef.current || !startRef.current) {
      return;
    }
    offsetRef.current = {
      x: e.clientX - startRef.current.x,
      y: e.clientY - startRef.current.y,
    };
    scheduleFrame();
  };

  const onPointerUp: PointerHandler = (e) => {
    if (!draggingRef.current) {
      return;
    }
    draggingRef.current = false;
    cancelFrame();
    const { x, y } = offsetRef.current;
    const node = cardRef.current;
    const verdict = dragVerdict(x, y);
    if (verdict) {
      if (node) {
        node.style.willChange = "";
      }
      onSwipe(verdict, { x, y });
    } else {
      if (node) {
        node.style.transition = REST_TRANSITION;
        node.style.transform = "translate3d(0, 0, 0) rotate(0deg)";
        node.style.cursor = "grab";
        const settling = node;
        window.setTimeout(() => {
          settling.style.willChange = "";
        }, 350);
      }
      const tap = tapRef.current;
      const dt = tap ? now() - tap.time : Number.POSITIVE_INFINITY;
      const dist = tap
        ? Math.hypot(e.clientX - tap.x, e.clientY - tap.y)
        : Number.POSITIVE_INFINITY;
      if (dt < TAP_MAX_MS && dist < TAP_MAX_DIST) {
        onTap?.();
      }
    }
    onDragEnd?.();
    startRef.current = null;
    tapRef.current = null;
    offsetRef.current = { x: 0, y: 0 };
  };

  useEffect(
    () => () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    },
    [],
  );

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
}
