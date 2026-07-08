import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Vitest — tests unitaires de la logique métier pure (PHIL-Q38).
 * Résout l'alias @/ comme le tsconfig ; n'exécute que les fichiers *.test.ts
 * sous tests/unit (les e2e Playwright vivent ailleurs).
 */
export default defineConfig({
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // On mesure la logique métier pure (pas l'UI/pages) : c'est là que la
      // couverture a du sens et protège des régressions.
      include: [
        "lib/budget/balances.ts",
        "lib/budget/rates.ts",
        "lib/budget/categories.ts",
        "lib/search/fuzzy.ts",
        "lib/events/datetime.ts",
        "lib/geo/distance.ts",
        "lib/geo/directions.ts",
        "lib/trips/status.ts",
        "lib/trips/packing-catalog.ts",
        "lib/notifications/preferences.ts",
        "lib/security/secret.ts",
        "lib/webauthn/vault-session-token.ts",
        "lib/account/reassign.ts",
        "lib/trips/image-guard.ts",
        "lib/activities/swipe.ts",
      ],
      thresholds: { lines: 85, functions: 85, statements: 85, branches: 75 },
    },
  },
});
