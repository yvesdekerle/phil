/**
 * Maths pures du geste de swipe (PHIL-U04), portées depuis Yallah
 * (`src/utils/swipe.ts`) et adaptées aux verdicts Phil. Aucune dépendance DOM →
 * testable. ⚠️ Corrige le bug de l'axe vertical du README de Yallah : c'est bien
 * **haut = SUPER**, **bas = MAYBE** (le code de Yallah faisait déjà foi).
 */

export type Verdict = "YES" | "NO" | "MAYBE" | "SUPER";

/** Distance (px) au-delà de laquelle un déplacement déclenche un verdict. */
export const SWIPE_THRESHOLD = 90;
const TRIGGER = SWIPE_THRESHOLD * 0.4;
const HORIZONTAL_BIAS = 0.7;
const MAX_ROTATION = 18;
const EXIT_DISTANCE = 600;

/**
 * Verdict correspondant à un déplacement (dx, dy) depuis l'origine, ou `null`
 * sous le seuil de déclenchement. L'horizontale est privilégiée (bias 0.7) pour
 * que les swipes obliques comptent comme YES/NO plutôt que SUPER/MAYBE.
 */
export function dragVerdict(dx: number, dy: number): Verdict | null {
  const horizontal = Math.abs(dx) > Math.abs(dy) * HORIZONTAL_BIAS;
  if (horizontal) {
    if (Math.abs(dx) < TRIGGER) {
      return null;
    }
    return dx > 0 ? "YES" : "NO";
  }
  if (Math.abs(dy) < TRIGGER) {
    return null;
  }
  return dy < 0 ? "SUPER" : "MAYBE";
}

/** Rotation de la carte (deg) selon le déplacement horizontal, bornée ±18. */
export function dragRotation(dx: number): number {
  const raw = (dx / SWIPE_THRESHOLD) * MAX_ROTATION;
  return Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, raw));
}

/** Intensité 0..1 du feedback visuel selon la distance parcourue. */
export function dragIntensity(dx: number, dy: number): number {
  return Math.max(0, Math.min(1, Math.hypot(dx, dy) / SWIPE_THRESHOLD));
}

/** Cible hors-écran pour l'animation de sortie de la carte selon le verdict. */
export function exitOffset(verdict: Verdict): { x: number; y: number } {
  switch (verdict) {
    case "YES":
      return { x: EXIT_DISTANCE, y: 0 };
    case "NO":
      return { x: -EXIT_DISTANCE, y: 0 };
    case "SUPER":
      return { x: 0, y: -EXIT_DISTANCE };
    case "MAYBE":
      return { x: 0, y: EXIT_DISTANCE };
  }
}
