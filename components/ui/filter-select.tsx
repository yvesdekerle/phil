"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

/**
 * Filtre générique en menu déroulant (PHIL-Q37c) — navigue vers l'URL de
 * l'option choisie. Remplace les longues rangées de pastilles (carte, documents…).
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
    <select
      value={value}
      disabled={pending}
      onChange={(e) => {
        const href = options.find((o) => o.value === e.target.value)?.href;
        if (href) startTransition(() => router.push(href));
      }}
      aria-label={ariaLabel}
      className={cn(
        "h-9 w-full cursor-pointer rounded-full border border-laiton-clair bg-papier pr-8 pl-3 text-sm text-encre transition-colors hover:border-laiton focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laiton disabled:opacity-60 sm:w-64",
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
