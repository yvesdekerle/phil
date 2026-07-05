"use client";

import { useEffect } from "react";
import { logger } from "@/lib/observability/logger";

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

  return (
    <html lang="fr">
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
          background: "#f4eee1",
          color: "#1f2a44",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontStyle: "italic", margin: 0 }}>Phil a perdu le fil</h1>
        <p style={{ fontSize: "0.9rem", color: "#6b5d4a", maxWidth: "24rem" }}>
          Une avarie inattendue. Recharge la page — l'aventure reprend.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            border: "none",
            borderRadius: "9999px",
            background: "#6e1f2e",
            color: "#f4eee1",
            padding: "0.5rem 1.25rem",
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          Reprendre la route
        </button>
      </body>
    </html>
  );
}
