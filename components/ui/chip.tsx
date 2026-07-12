import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * B4 Chip (Lagune vive) — trois livrées :
 * `filter` = pill h-32 / hit 44, sélectionné = ink plein + label blanc ;
 * `event` = r-8, 11/600 (chips « À confirmer » en citron-wash via className) ;
 * `flight` = ink-deep + mono (badges vol `✈ 21:40`).
 * Rail horizontal recommandé : `flex gap-2 overflow-x-auto` sans retour à la ligne.
 */
const chipVariants = cva(
  "relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap transition-colors outline-none after:absolute after:inset-x-0 after:-inset-y-1.5 focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand active:scale-[.98] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        filter: "h-8 rounded-full border border-line bg-card px-3 text-ui text-slate hover:bg-wash",
        event: "h-6 rounded-md bg-wash px-2 text-caption font-semibold text-slate",
        flight: "h-6 rounded-md bg-ink-deep px-2 font-mono text-data text-white",
      },
      selected: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        variant: "filter",
        selected: true,
        className: "border-ink bg-ink text-white hover:bg-ink",
      },
    ],
    defaultVariants: {
      variant: "filter",
      selected: false,
    },
  },
);

function Chip({
  className,
  variant = "filter",
  selected = false,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof chipVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="chip"
      data-variant={variant}
      data-selected={selected || undefined}
      aria-pressed={variant === "filter" && !asChild ? Boolean(selected) : undefined}
      className={cn(chipVariants({ variant, selected, className }))}
      {...props}
    />
  );
}

export { Chip, chipVariants };
