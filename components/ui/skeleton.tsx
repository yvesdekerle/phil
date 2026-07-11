import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Squelette de chargement (Lagune vive) — blocs wash r-8, jamais de spinner
 * plein écran. Composer des silhouettes proches du contenu final.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-wash", className)}
      {...props}
    />
  );
}

export { Skeleton };
