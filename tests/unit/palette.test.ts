import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { palette } from "@/lib/ui/colors";

/**
 * Source de vérité unique (PHIL-R20 / audit A9) : la palette JS doit refléter
 * exactement les variables CSS de `app/globals.css`. Ce test échoue dès qu'une
 * des deux dérive, pour empêcher le retour des couleurs magiques désynchronisées.
 */
const CSS = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

/** Nom camelCase du token JS → variable CSS `--kebab-case`. */
const CSS_VAR: Record<keyof typeof palette, string> = {
  ink: "--ink",
  inkDeep: "--ink-deep",
  slate: "--slate",
  mist: "--mist",
  ghost: "--ghost",
  sand: "--sand",
  card: "--card",
  wash: "--wash",
  line: "--line",
  citronWash: "--citron-wash",
  lagoon: "--lagoon",
  lagoonInk: "--lagoon-ink",
  lagoonSoft: "--lagoon-soft",
  lagoonWash: "--lagoon-wash",
  lagoonHover: "--lagoon-hover",
  citron: "--citron",
  berry: "--berry",
  berryInk: "--berry-ink",
  berryWash: "--berry-wash",
};

function cssValue(variable: string): string | null {
  const match = CSS.match(new RegExp(`${variable}:\\s*(#[0-9a-fA-F]{3,6})`));
  return match ? match[1].toLowerCase() : null;
}

describe("palette JS ↔ globals.css", () => {
  for (const [token, hex] of Object.entries(palette)) {
    it(`${token} correspond à ${CSS_VAR[token as keyof typeof palette]} dans globals.css`, () => {
      expect(cssValue(CSS_VAR[token as keyof typeof palette])).toBe(hex.toLowerCase());
    });
  }
});
