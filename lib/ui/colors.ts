/**
 * Palette « Lagune vive » — miroir JS des tokens couleur de `app/globals.css`
 * (source de vérité : tmp/design_phil_v2/README.md §8a). À utiliser dans les
 * contextes **hors CSS/Tailwind** où l'on manipule une couleur en JavaScript :
 * SVG/canvas, marqueurs Leaflet, styles inline, e-mails (React Email),
 * `manifest.ts`, `theme-color`. En `className`, préférer **toujours** les
 * classes Tailwind (`text-ink`, `bg-sand`, `border-line`, …) qui pointent sur
 * ces mêmes variables CSS.
 *
 * ⚠️ Toute modification d'une valeur doit rester synchronisée avec la variable
 * CSS `--<token>` correspondante dans `app/globals.css`. Le test
 * `tests/unit/palette.test.ts` verrouille cet invariant.
 */
export const palette = {
  /* Encres & textes */
  ink: "#0f2f38",
  inkDeep: "#081e24",
  slate: "#5c7078",
  mist: "#6c7e84",
  ghost: "#93a3a8",
  /* Fonds & structure */
  sand: "#fbf9f4",
  card: "#ffffff",
  wash: "#f1efe8",
  line: "#e7e2d6",
  citronWash: "#fff8df",
  /* Accents & sémantique */
  lagoon: "#00a7b5",
  lagoonInk: "#00727c",
  lagoonSoft: "#9ed4d9",
  lagoonWash: "#e0f2f3",
  lagoonHover: "#00616a",
  citron: "#f6d33c",
  berry: "#d8548c",
  berryInk: "#c23d75",
  berryWash: "#fdeef4",
} as const;

export type PaletteColor = keyof typeof palette;
