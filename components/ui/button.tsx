import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * B1 Bouton (Lagune vive) — pill, h-44 mobile / h-36 desktop, 13/600.
 * Primaire = lagoon-ink (1 max par vue), secondaire = card + bordure line,
 * tertiaire (ghost) = texte lagoon-ink, destructif = berry-wash + berry-ink.
 * États : hover assombrit, focus anneau citron 2/offset 2, active scale .98,
 * disabled opacité .4, chargement `···` mono.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-body font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-citron focus-visible:ring-offset-2 focus-visible:ring-offset-sand active:scale-[.98] disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none aria-invalid:border-berry-ink aria-invalid:ring-2 aria-invalid:ring-berry-ink/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-lagoon-ink text-white hover:bg-lagoon-hover",
        outline: "border-line bg-card text-ink hover:bg-wash aria-expanded:bg-wash",
        secondary: "bg-wash text-ink hover:bg-line/70 aria-expanded:bg-line/70",
        ghost: "text-lagoon-ink hover:bg-lagoon-wash aria-expanded:bg-lagoon-wash",
        destructive:
          "bg-berry-wash text-berry-ink hover:bg-berry-ink/15 focus-visible:ring-berry-ink/30",
        link: "text-lagoon-ink underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-11 gap-1.5 px-4 md:h-9 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-8 gap-1 px-3 text-ui has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1 px-3.5 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-1.5 px-5",
        icon: "size-11 md:size-9",
        "icon-xs": "size-8 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Chargement B1 : contenu remplacé par `···` mono, bouton inerte. */
    loading?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      disabled={disabled || loading || undefined}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading && !asChild ? <span className="font-mono tracking-widest">···</span> : children}
    </Comp>
  );
}

export { Button, buttonVariants };
