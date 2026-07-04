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
  },
});
