import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * B8 Header de page (Lagune vive) — kicker label 10 mono-caps + titre
 * (title 24 mobile / display 28 desktop), actions = icônes 20 dans un hit 44.
 * Pas de fil d'Ariane. Le point berry de notification est un point CSS porté
 * par l'action concernée.
 */
function PageHeader({
  kicker,
  title,
  actions,
  className,
  children,
  ...props
}: React.ComponentProps<"header"> & {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header
      data-slot="page-header"
      className={cn("flex items-start justify-between gap-4", className)}
      {...props}
    >
      <div className="min-w-0">
        {kicker && (
          <p className="mb-1 font-mono text-label text-mist uppercase tabular-nums">{kicker}</p>
        )}
        <h1 className="text-title text-ink md:text-display">{title}</h1>
        {children}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}

export { PageHeader };
