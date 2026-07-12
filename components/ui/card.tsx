import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * B3 Carte (Lagune vive) — r-12, p-16. Une carte a bordure OU ombre, jamais
 * les deux : `outline` (défaut, sur sand) = bordure line sans ombre ;
 * `floating` = ombre card sans bordure ; `interactive` = hover ombre float +
 * translateY(-1) ; `dark` = ink-deep + filets blancs .14.
 */
const cardVariants = cva(
  "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-lg py-(--card-spacing) text-body [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-lg *:[img:last-child]:rounded-b-lg",
  {
    variants: {
      variant: {
        outline: "border border-line bg-card text-card-foreground",
        floating: "bg-card text-card-foreground shadow-card",
        interactive:
          "bg-card text-card-foreground shadow-card transition-all hover:-translate-y-px hover:shadow-float",
        dark: "bg-ink-deep text-white *:data-[slot=card-footer]:border-white/15",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

function Card({
  className,
  size = "default",
  variant = "outline",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      className={cn(cardVariants({ variant, className }))}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-lg px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-subhead group-data-[size=sm]/card:text-body group-data-[size=sm]/card:font-semibold",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        "text-body text-slate group-data-[variant=dark]/card:text-lagoon-soft",
        className,
      )}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("px-(--card-spacing)", className)} {...props} />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-lg border-t bg-wash/50 p-(--card-spacing) group-data-[variant=dark]/card:bg-white/5",
        className,
      )}
      {...props}
    />
  );
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
