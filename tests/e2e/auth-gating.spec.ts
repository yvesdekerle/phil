import { expect, test } from "@playwright/test";

/**
 * Gating de sécurité (PHIL-Q38) — la sécurité de Phil repose sur ces
 * redirections : un visiteur non connecté ne doit jamais atteindre les données.
 */
test.describe("visiteur non connecté", () => {
  test("la racine redirige vers /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("la page de connexion invite à embarquer avec Google", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Bienvenue à bord")).toBeVisible();
    await expect(page.getByRole("button", { name: /Continuer avec Google/i })).toBeVisible();
  });

  test("les voyages sont protégés (redirection login)", async ({ page }) => {
    await page.goto("/trips");
    await expect(page).toHaveURL(/\/login/);
  });

  test("le coffre est protégé (redirection login)", async ({ page }) => {
    await page.goto("/vault");
    await expect(page).toHaveURL(/\/login/);
  });

  test("l'API document ne sert jamais un fichier à un visiteur non connecté", async ({
    request,
  }) => {
    // Le proxy (PHIL-C02) intercepte avant le handler : redirection vers /login,
    // le document n'est jamais servi. Défense en profondeur.
    const res = await request.get(
      "/api/documents/00000000-0000-0000-0000-000000000000/view",
      { maxRedirects: 0 },
    );
    expect(res.status()).toBe(307);
    expect(res.headers().location).toContain("/login");
  });

  test("la politique de confidentialité est publique", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByText("Politique de confidentialité")).toBeVisible();
  });
});
