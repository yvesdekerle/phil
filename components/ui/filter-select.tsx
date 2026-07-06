"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

/**
 * Filtre générique en menu déroulant (PHIL-Q37c) — navigue vers l'URL de
 * l'option choisie. Chevron custom, un peu en retrait du bord droit.
 */
export function FilterSelect({
  value,
  options,
  ariaLabel,
  className,
}: {
  value: string;
  options: { value: string; label: string; href: string }[];
  ariaLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className={cn("relative inline-block w-full sm:w-64", className)}>
      <select
        value={value}
        disabled={pending}
        onChange={(e) => {
          const href = options.find((o) => o.value === e.target.value)?.href;
          if (href) startTransition(() => router.push(href));
        }}
        aria-label={ariaLabel}
        className="h-9 w-full cursor-pointer appearance-none rounded-full border border-laiton-clair bg-papier pr-9 pl-3 text-sm text-encre transition-colors hover:border-laiton focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laiton disabled:opacity-60"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-encre-douce"
        aria-hidden="true"
      />
    </div>
  );
}
