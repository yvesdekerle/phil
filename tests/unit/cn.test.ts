import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

/**
 * V07a — tailwind-merge doit connaître les 9 styles de texte du design system
 * comme des TAILLES : sans la config d'extension, il les prenait pour des
 * couleurs et les supprimait dès qu'une couleur `text-*` suivait dans le même
 * cn() (les barres du Gantt retombaient sur le 16 px hérité).
 */
describe("cn — styles de texte Lagune vive", () => {
  const SIZES = [
    "display",
    "title",
    "heading",
    "subhead",
    "body",
    "ui",
    "caption",
    "data",
    "label",
  ] as const;

  it("garde la taille custom quand une couleur text-* suit", () => {
    for (const s of SIZES) {
      expect(cn(`text-${s} text-slate`)).toBe(`text-${s} text-slate`);
      expect(cn(`text-${s}`, "text-white")).toBe(`text-${s} text-white`);
    }
  });

  it("garde la couleur quand une taille custom suit", () => {
    expect(cn("text-lagoon-ink", "text-caption")).toBe("text-lagoon-ink text-caption");
  });

  it("laisse deux tailles se résoudre (la dernière gagne)", () => {
    expect(cn("text-body", "text-caption")).toBe("text-caption");
    expect(cn("text-label", "text-sm")).toBe("text-sm");
  });

  it("laisse deux ombres du design system se résoudre", () => {
    expect(cn("shadow-card", "shadow-float")).toBe("shadow-float");
  });
});
