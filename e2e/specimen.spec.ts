import { test, expect } from "@playwright/test";

// The item page is the front door — these assertions guard the load-bearing SEO
// contract and the two-register structure against regressions.
test.describe("specimen page /specimens/postgres", () => {
  test("title is generic-keyword-first with the brand in the tail", async ({ page }) => {
    await page.goto("/specimens/postgres");
    await expect(page).toHaveTitle(/^Confidential PostgreSQL on Intel TDX — .+ · Terrarium$/);
  });

  test("lives at the workload-id slug, not the common name", async ({ page }) => {
    const res = await page.goto("/specimens/postgres");
    expect(res?.status()).toBe(200);
    // the cute name is never a route
    const vaultKeeper = await page.goto("/specimens/the-vault-keeper").catch(() => null);
    expect(vaultKeeper?.status() ?? 404).toBe(404);
  });

  test("H1 leads with the common name then states the keyword", async ({ page }) => {
    await page.goto("/specimens/postgres");
    const h1 = (await page.locator("h1").first().textContent()) ?? "";
    expect(h1).toContain("The Vault Keeper");
    expect(h1).toContain("PostgreSQL");
  });

  test("is self-canonical and indexable", async ({ page }) => {
    await page.goto("/specimens/postgres");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/specimens\/postgres\/?$/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
  });

  test("emits BreadcrumbList + SoftwareApplication JSON-LD", async ({ page }) => {
    await page.goto("/specimens/postgres");
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map((b) => JSON.parse(b)["@type"]);
    expect(types).toContainEqual("BreadcrumbList");
    expect(types.some((t) => Array.isArray(t) && t.includes("SoftwareApplication"))).toBe(true);
  });

  test("per-item-data moat: strip the workload name and the measurement + boundary remain", async ({ page }) => {
    await page.goto("/specimens/postgres");
    const body = (await page.locator("body").textContent()) ?? "";
    const stripped = body.replaceAll("PostgreSQL", "").replaceAll("postgres", "");
    expect(stripped).toContain("adc1ac8e23769d8f53e1cc44c890932ce32f1579371efedc65e3047d4833ed18"); // measurement
    expect(stripped).toContain("deny-all"); // boundary spec
  });

  test("both registers render and the resolve target is present", async ({ page }) => {
    await page.goto("/specimens/postgres");
    await expect(page.locator("text=Natural predators")).toBeVisible(); // field-guide register
    await expect(page.locator("#boundary")).toBeVisible(); // inspector register
    await expect(page.locator("#resolve")).toContainText('"imageRef"');
  });

  test("the resolve JSON endpoint matches the consumer contract", async ({ request }) => {
    const res = await request.get("/catalog/postgres.json");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual([
      "attestations",
      "boundarySpec",
      "freshness",
      "imageRef",
      "measurement",
      "proofTier",
      "publisher",
      "tier",
    ]);
  });
});
