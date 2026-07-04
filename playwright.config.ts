import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright — tests e2e (PHIL-Q38). Couvrent les surfaces non authentifiées :
 * redirections de sécurité, gating des pages protégées, rendu public.
 * (L'auth réelle passe par Google OAuth : pas d'e2e authentifié sans backdoor,
 * volontairement écarté sur une app qui manipule des pièces d'identité.)
 *
 * Réutilise un `pnpm dev` déjà lancé ; sinon en démarre un.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
