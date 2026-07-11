import { PlusIcon } from "lucide-react";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * B10 FAB (Lagune vive) — 52, lagoon-ink + ombre glow, icône Plus 24.
 * **Un seul par vue.** Placement : à 16 du bord, 24 au-dessus de la barre
 * d'onglets (positionnement laissé à la page via className).
 */
function Fab({
  className,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="fab"
      className={cn(
        "inline-flex size-13 shrink-0 items-center justify-center rounded-full bg-lagoon-ink text-white shadow-glow transition-all outline-none hover:bg-lagoon-hover focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand active:scale-[.98] disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6",
        className,
      )}
      {...props}
    >
      {children ?? <PlusIcon />}
    </Comp>
  );
}

export { Fab };
