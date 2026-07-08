"use client";

import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { dragIntensity, dragVerdict, type Verdict } from "@/lib/activities/swipe";

/**
 * Feedback visuel du swipe (PHIL-U04 Phase 2), porté de Yallah
 * (`DragFeedback`/`HeartStamp`/`StampOverlay`/`SuperLikeFX`) et re-teinté à la
 * palette Phil. Isolé dans son propre composant à **handle impératif** : les
 * rafales de drag ne re-render que ce petit sous-arbre, jamais le stack de
 * cartes (dont le transform reste écrit au DOM par `use-swipe-gesture`).
 */

const COLOR: Record<Verdict, string> = {
  YES: "#3f7a5a", // vert
  NO: "#6e1f2e", // bordeaux
  MAYBE: "#a98a54", // laiton
  SUPER: "#2b3a67", // bleu-nuit
};
const ROTATION: Record<Verdict, number> = { YES: -8, NO: 10, MAYBE: -4, SUPER: 0 };

export interface DragFeedbackHandle {
  /** Position courante du drag (appelée au plus une fois par frame). */
  update: (x: number, y: number) => void;
  /** Efface le feedback à la fin du drag. */
  clear: () => void;
}

type DragState = { x: number; y: number; active: boolean };

export const DragFeedback = forwardRef<DragFeedbackHandle, { labels: Record<Verdict, string> }>(
  function DragFeedback({ labels }, ref) {
    const [drag, setDrag] = useState<DragState>({ x: 0, y: 0, active: false });

    useImperativeHandle(
      ref,
      () => ({
        update: (x, y) => setDrag({ x, y, active: true }),
        clear: () => setDrag((d) => (d.active ? { x: 0, y: 0, active: false } : d)),
      }),
      [],
    );

    const verdict = drag.active ? dragVerdict(drag.x, drag.y) : null;
    if (!verdict) {
      return null;
    }
    const intensity = dragIntensity(drag.x, drag.y);

    return (
      <>
        <div
          className="pointer-events-none absolute"
          style={{
            inset: -40,
            background: COLOR[verdict],
            opacity: intensity * 0.16,
          }}
        />
        <Stamp verdict={verdict} intensity={intensity} label={labels[verdict]} />
      </>
    );
  },
);

/** Tampon centré du verdict — cœur pour OUI, tampon caoutchouc pour les autres. */
export function Stamp({
  verdict,
  intensity,
  label,
}: {
  verdict: Verdict;
  intensity: number;
  label: string;
}) {
  const color = COLOR[verdict];
  const opacity = Math.min(1, intensity * 1.4 + 0.1);
  const scale = 0.85 + intensity * 0.22;

  if (verdict === "YES") {
    return (
      <div
        className="pointer-events-none absolute z-20"
        style={{
          top: "36%",
          left: "50%",
          width: 180,
          height: 162,
          transform: `translate(-50%, -50%) rotate(${ROTATION.YES}deg) scale(${scale})`,
          opacity,
          filter: `drop-shadow(0 12px 24px ${color}55)`,
          transition: "opacity 0.1s",
        }}
      >
        <svg viewBox="0 0 200 180" width="180" height="162" className="block" aria-hidden="true">
          <title>{label}</title>
          <path
            d="M100 168 C 100 168, 14 116, 14 56 C 14 28, 38 12, 62 12 C 82 12, 96 24, 100 42 C 104 24, 118 12, 138 12 C 162 12, 186 28, 186 56 C 186 116, 100 168, 100 168 Z"
            fill={color}
            stroke="#fff"
            strokeWidth="6"
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center font-display uppercase text-papier"
          style={{ paddingBottom: 22, fontSize: 26, letterSpacing: 1 }}
        >
          {label}
        </span>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute z-20 flex items-center gap-1.5 font-display uppercase"
      style={{
        top: "38%",
        left: "50%",
        transform: `translate(-50%, -50%) rotate(${ROTATION[verdict]}deg) scale(${scale})`,
        padding: "8px 18px",
        border: `5px solid ${color}`,
        borderRadius: 12,
        color,
        background: "rgba(251,248,241,0.94)",
        fontSize: 22,
        letterSpacing: 1,
        lineHeight: 1,
        whiteSpace: "nowrap",
        boxShadow: `0 12px 30px -8px ${color}80`,
        opacity,
        transition: "opacity 0.1s",
      }}
    >
      {verdict === "SUPER" ? <StarGlyph size={20} color={color} /> : null}
      {label}
    </div>
  );
}

function StarGlyph({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2l2.95 6.5L22 9.7l-5.2 5.05L18 22l-6-3.4L6 22l1.2-7.25L2 9.7l7.05-1.2L12 2z"
        fill={color}
      />
    </svg>
  );
}

type Sparkle = { key: number; dx: number; dy: number; rot: number; size: number };
const SPARKLES: Sparkle[] = Array.from({ length: 10 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / 10;
  const dist = 120;
  return {
    key: i,
    dx: Math.cos(angle) * dist,
    dy: Math.sin(angle) * dist,
    rot: (i % 2 === 0 ? 1 : -1) * 140,
    size: 12 + (i % 3) * 5,
  };
});

/**
 * Flourish plein-écran du coup de cœur : flash radial, étoile qui surgit avec le
 * libellé, étincelles qui s'éparpillent. Monté à la validation d'un SUPER, retiré
 * par le parent après ~700 ms. Toutes les animations sont en keyframes CSS.
 */
export function SuperLikeFX({ label }: { label: string }) {
  const sparkles = useMemo(() => SPARKLES, []);
  const gold = "#a98a54";
  const nuit = "#2b3a67";
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <div
        className="animate-super-flash absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${nuit}55, transparent 65%)`,
        }}
      />
      {sparkles.map((s) => (
        <div
          key={s.key}
          className="animate-super-sparkle absolute"
          style={
            {
              top: "45%",
              left: "50%",
              width: s.size,
              height: s.size,
              "--dx": `${s.dx}px`,
              "--dy": `${s.dy}px`,
              "--rot": `${s.rot}deg`,
            } as React.CSSProperties
          }
        >
          <StarGlyph size={s.size} color={s.key % 2 === 0 ? gold : nuit} />
        </div>
      ))}
      <div
        className="animate-super-pop absolute"
        style={{ top: "45%", left: "50%", width: 168, height: 168 }}
      >
        <svg viewBox="0 0 168 168" width="168" height="168" className="block" aria-hidden="true">
          <path
            d={starPath(84, 84, 80, 40)}
            fill={nuit}
            stroke="#fff"
            strokeWidth="6"
            strokeLinejoin="round"
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center px-4 text-center font-display uppercase leading-tight text-papier"
          style={{ fontSize: 20, letterSpacing: 1 }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

/** Chemin d'une étoile à 5 branches (rayons externe R / interne r). */
function starPath(cx: number, cy: number, R: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? R : r;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(
      `${(cx + Math.cos(angle) * radius).toFixed(1)} ${(cy + Math.sin(angle) * radius).toFixed(1)}`,
    );
  }
  return `M ${pts.join(" L ")} Z`;
}
