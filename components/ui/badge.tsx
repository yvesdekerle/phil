import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * B5 Badge mono (Lagune vive) — label 10/600 caps ls .06em, r-4, padding 3×8,
 * **jamais cliquable**. Cinq livrées : neutre, lagune, citron (urgence du
 * jour), berry (attente/social), capitaine (ink/citron, unique par équipage).
 */
const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-[3px] font-mono text-label uppercase tabular-nums select-none",
  {
    variants: {
      variant: {
        neutral: "bg-wash text-slate",
        lagoon: "bg-lagoon-wash text-lagoon-ink",
        citron: "bg-citron text-ink",
        berry: "bg-berry-wash text-berry-ink",
        captain: "bg-ink text-citron",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

function Badge({
  className,
  variant = "neutral",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
