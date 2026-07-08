/**
 * Palette Phil — miroir JS des tokens couleur de `app/globals.css` (source de
 * vérité, PHIL-R20 / audit A9). À utiliser dans les contextes **hors
 * CSS/Tailwind** où l'on manipule une couleur en JavaScript : SVG/canvas,
 * marqueurs Leaflet, styles inline, e-mails (React Email), `manifest.ts`,
 * `theme-color`. En `className`, préférer **toujours** les classes Tailwind
 * (`text-bordeaux`, `bg-papier`, `border-laiton-clair`, …) qui pointent sur ces
 * mêmes variables CSS.
 *
 * ⚠️ Toute modification d'une valeur doit rester synchronisée avec la variable
 * CSS `--<token>` correspondante dans `app/globals.css`. Le test
 * `tests/unit/palette.test.ts` verrouille cet invariant.
 */
export const palette = {
  parchemin: "#f4eee1",
  papier: "#fbf8f1",
  encre: "#1f2a44",
  encreDouce: "#5a6379",
  bordeaux: "#6e1f2e",
  bordeauxFonce: "#571723",
  laiton: "#a98a54",
  laitonClair: "#d9c9a3",
  vert: "#3f7a5a",
  bleuNuit: "#2b3a67",
} as const;

export type PaletteColor = keyof typeof palette;
