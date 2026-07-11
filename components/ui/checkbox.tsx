"use client";

import { CheckIcon, MinusIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * B11 Case à cocher (Lagune vive) — visuel 20 / hit 44 / r-4, coche sur fond
 * lagoon-ink. États : vide, cochée, indéterminée, focus citron, disabled .4.
 * Le rond 50 % est **réservé au vote simple des sondages** (hors de cette
 * primitive) ; partout ailleurs (valise, courses, conseils), la case est carrée.
 */
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative size-5 shrink-0 rounded-sm border border-ghost bg-card transition-colors outline-none after:absolute after:-inset-3 focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand data-checked:border-lagoon-ink data-checked:bg-lagoon-ink data-indeterminate:border-lagoon-ink data-indeterminate:bg-lagoon-ink data-disabled:pointer-events-none data-disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-white"
      >
        {props.checked === "indeterminate" ? (
          <MinusIcon className="size-3.5" />
        ) : (
          <CheckIcon className="size-3.5" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
