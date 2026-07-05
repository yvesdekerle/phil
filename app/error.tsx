"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/observability/logger";

/**
 * Error boundary de segment (PHIL-Q46) — attrape les erreurs de rendu des
 * routes et évite l'écran d'erreur brut de Next. Logge sans PII (digest seul).
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("route_error", { digest: error.digest });
  }, [error]);

  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <p className="font-display text-2xl text-encre italic">Phil a perdu le fil</p>
      <p className="text-sm text-encre-douce">
        Une escale imprévue — même Phileas a connu quelques contretemps. Réessaie dans un instant.
      </p>
      <Button type="button" onClick={reset}>
        Reprendre la route
      </Button>
    </main>
  );
}
