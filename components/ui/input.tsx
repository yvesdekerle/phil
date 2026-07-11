import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * B2 Champ (Lagune vive) — h-44, r-8, body 13 (16 sur mobile pour éviter le
 * zoom iOS), placeholder mist, focus bordure lagoon + anneau citron, erreur
 * bordure berry-ink (toujours accompagnée d'une caption, jamais la couleur
 * seule).
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-md border border-line bg-card px-3 py-1 text-base transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-body file:font-semibold file:text-ink placeholder:text-mist focus-visible:border-lagoon focus-visible:ring-2 focus-visible:ring-citron disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-wash disabled:opacity-40 aria-invalid:border-berry-ink aria-invalid:ring-2 aria-invalid:ring-berry-ink/20 md:text-body",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
