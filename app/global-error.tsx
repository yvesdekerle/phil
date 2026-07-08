"use client";

import { useEffect } from "react";
import { logger } from "@/lib/observability/logger";
import { palette } from "@/lib/ui/colors";

/**
 * Dictionnaire autonome (PHIL-Q37) : cette page vit HORS du provider i18n
 * (elle remplace tout le document), donc pas de `useT`. On lit la langue via
 * le cookie `NEXT_LOCALE` et on retombe sur le français par défaut.
 */
const MESSAGES = {
  fr: {
    lang: "fr",
    title: "Phil a perdu le fil",
    body: "Une avarie inattendue. Recharge la page — l'aventure reprend.",
    button: "Reprendre la route",
  },
  en: {
    lang: "en",
    title: "Phil lost the thread",
    body: "An unexpected mishap. Reload the page — the adventure resumes.",
    button: "Back on the road",
  },
  es: {
    lang: "es",
    title: "Phil ha perdido el hilo",
    body: "Un contratiempo inesperado. Recarga la página — la aventura continúa.",
    button: "Volver a la ruta",
  },
} as const;

type ErrorLocale = keyof typeof MESSAGES;

function readLocale(): ErrorLocale {
  if (typeof document === "undefined") return "fr";
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  const value = match?.[1];
  return value === "en" || value === "es" ? value : "fr";
}

/**
 * Error boundary racine (PHIL-Q46) — remplace tout le document si le layout
 * racine lui-même échoue. Doit rendre ses propres <html>/<body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("global_error", { digest: error.digest });
  }, [error]);

  const m = MESSAGES[readLocale()];

  return (
    <html lang={m.lang}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          background: palette.parchemin,
          color: palette.encre,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontStyle: "italic", margin: 0 }}>{m.title}</h1>
        <p style={{ fontSize: "0.9rem", color: "#6b5d4a", maxWidth: "24rem" }}>{m.body}</p>
        <button
          type="button"
          onClick={reset}
          style={{
            border: "none",
            borderRadius: "9999px",
            background: palette.bordeaux,
            color: palette.parchemin,
            padding: "0.5rem 1.25rem",
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          {m.button}
        </button>
      </body>
    </html>
  );
}
