import { expect, test } from "@playwright/test";

/**
 * En-têtes de sécurité (PHIL-J01) et non-régression du viewer (PHIL-Q30).
 * Le reste du site est verrouillé en anti-framing ; la route du viewer de
 * documents doit au contraire s'autoriser en same-origin, sinon l'aperçu PDF
 * casse (page grise) — c'est exactement le bug corrigé en Q30.
 */
test.describe("en-têtes de sécurité", () => {
  test("les pages normales interdisent le framing (DENY)", async ({ request }) => {
    const res = await request.get("/login");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("le viewer de documents autorise le framing same-origin (Q30)", async ({ request }) => {
    const res = await request.get(
      "/api/documents/00000000-0000-0000-0000-000000000000/view",
      { maxRedirects: 0 },
    );
    expect(res.headers()["x-frame-options"]).toBe("SAMEORIGIN");
    const csp = res.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).not.toContain("frame-ancestors 'none'");
  });
});
