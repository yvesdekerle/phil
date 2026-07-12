"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Gabarit du contenu d'une page voyage. Timeline et Carte s'étalent au-delà
 * du gabarit 1200 (retour desktop V06c : « Timeline et carte plus de
 * largeur ? ») ; les autres pages gardent `max-w-content`.
 */
export function TripMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wide = /^\/trips\/[^/]+\/(timeline|map)(\/|$)/.test(pathname);
  return (
    <main
      className={cn(
        "mx-auto w-full flex-1 px-4 pb-24 lg:px-8 lg:py-6 lg:pb-8",
        wide ? "max-w-[104rem]" : "max-w-content",
      )}
    >
      {children}
    </main>
  );
}
