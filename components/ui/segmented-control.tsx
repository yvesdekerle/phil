import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Segmented control (Lagune vive, handoff §6) — fond wash, pilule active ink
 * + label blanc, inactifs transparents/slate. Sert aux sous-vues (Journal :
 * Aperçu · Calendrier · Timeline ; Bourse : Suivi · Dépenses · Équilibre).
 * Purement présentational : les items peuvent être des boutons ou des liens
 * (`asChild`), l'état actif est porté par la prop `active`.
 */
function SegmentedControl({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="segmented-control"
      className={cn("inline-flex items-center gap-1 rounded-full bg-wash p-1", className)}
      {...props}
    />
  );
}

function SegmentedControlItem({
  className,
  active = false,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & {
  active?: boolean;
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="segmented-control-item"
      data-active={active || undefined}
      aria-current={active || undefined}
      className={cn(
        "relative inline-flex h-8 items-center justify-center rounded-full px-3 text-ui whitespace-nowrap transition-colors outline-none after:absolute after:inset-x-0 after:-inset-y-1.5 focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand active:scale-[.98] disabled:pointer-events-none disabled:opacity-40",
        active ? "bg-ink text-white" : "text-slate hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}

export { SegmentedControl, SegmentedControlItem };
