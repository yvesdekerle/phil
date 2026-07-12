import { ChevronRightIcon } from "lucide-react";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * B6 Rangée de liste (Lagune vive) — min-h 44 (56 avec sous-titre), hover
 * wash, active scale .995, chevron 16 mist. Avatars : 20 empilé / 28 rangée /
 * 40 profil (portés par la page). Séparateurs : `divide-y divide-wash` en
 * interne de carte, `divide-line` en externe.
 */
function ListRow({
  className,
  interactive = false,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & {
  /** Rangée cliquable : hover wash + focus citron + active .995. */
  interactive?: boolean;
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      data-slot="list-row"
      className={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-body",
        interactive &&
          "transition-colors outline-none hover:bg-wash focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand active:scale-[.995]",
        className,
      )}
      {...props}
    />
  );
}

function ListRowContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="list-row-content" className={cn("min-w-0 flex-1", className)} {...props} />
  );
}

function ListRowTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="list-row-title" className={cn("truncate text-subhead", className)} {...props} />
  );
}

function ListRowSubtitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="list-row-subtitle"
      className={cn("truncate text-caption text-slate", className)}
      {...props}
    />
  );
}

function ListRowChevron({ className, ...props }: React.ComponentProps<typeof ChevronRightIcon>) {
  return (
    <ChevronRightIcon
      data-slot="list-row-chevron"
      aria-hidden="true"
      className={cn("size-4 shrink-0 text-mist", className)}
      {...props}
    />
  );
}

export { ListRow, ListRowChevron, ListRowContent, ListRowSubtitle, ListRowTitle };
