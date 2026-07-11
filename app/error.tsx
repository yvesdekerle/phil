"use client";

import { useEffect } from "react";
import { useT } from "@/components/i18n/provider";
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
  const t = useT();
  useEffect(() => {
    logger.error("route_error", { digest: error.digest });
  }, [error]);

  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <p className="font-sans text-2xl text-ink italic">{t("error.title")}</p>
      <p className="text-sm text-slate">{t("error.body")}</p>
      <Button type="button" onClick={reset}>
        {t("error.retry")}
      </Button>
    </main>
  );
}
