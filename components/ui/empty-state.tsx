import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * État vide (Lagune vive) — icône + une phrase + action. La phrase porte la
 * microcopy Phil (chaleureuse, première personne bienvenue).
 */
function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-line bg-card px-6 py-10 text-center",
        className,
      )}
      {...props}
    >
      {icon && (
        <div
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-full bg-wash text-slate [&_svg]:size-5"
        >
          {icon}
        </div>
      )}
      <p className="text-subhead text-ink">{title}</p>
      {description && <p className="max-w-[44ch] text-body text-slate">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export { EmptyState };
