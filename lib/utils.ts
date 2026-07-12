import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// V07a : tailwind-merge ne connaît que l'échelle par défaut (text-xs…text-9xl) ;
// sans cette config, il classe nos 9 styles de texte comme des couleurs et les
// supprime dès qu'une vraie couleur `text-*` suit dans le même cn(). Idem pour
// les ombres du design system face à une éventuelle shadow-color.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "title",
            "heading",
            "subhead",
            "body",
            "ui",
            "caption",
            "data",
            "label",
          ],
        },
      ],
      shadow: [{ shadow: ["card", "float", "modal", "sheet", "glow"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
