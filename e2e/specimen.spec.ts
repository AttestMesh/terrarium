import { test, expect } from "@playwright/test";

// The item page is the front door — these assertions guard the SEO contract and the
// two-register structure against regressions, on the real dstackgres specimen.
const MEASUREMENT = "e1eb74c5a2222449ae122ada7935cf6fc9ace1fc0dba53f7f543c60445a97272";

test.describe("specimen page /specimens/dstackgres", () => {
  test("title is generic-keyword-first with the brand in the tail", async ({ page }) => {
    await page.goto("/specimens/dstackgres");
    await expect(page).toHaveTitle(/^Confidential PostgreSQL on Intel TDX — .+ · Terrarium$/);
  });

  test("lives at the workload-id slug; an unknown slug 404s", async ({ page }) => {
    const res = await page.goto("/specimens/dstackgres");
    expect(res?.status()).toBe(200);
    const missing = await page.goto("/specimens/teesql-postgres").catch(() => null);
    expect(missing?.status() ?? 404).toBe(404);
  });

  test("H1 leads with the common name then states the keyword", async ({ page }) => {
    await page.goto("/specimens/dstackgres");
    const h1 = (await page.locator("h1").first().textContent()) ?? "";
    expect(h1).toContain("dstackgres");
    expect(h1).toContain("PostgreSQL");
  });

  test("is self-canonical and indexable", async ({ page }) => {
    await page.goto("/specimens/dstackgres");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/specimens\/dstackgres\/?$/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
  });

  test("emits BreadcrumbList + SoftwareApplication JSON-LD", async ({ page }) => {
    await page.goto("/specimens/dstackgres");
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map((b) => JSON.parse(b)["@type"]);
    expect(types).toContainEqual("BreadcrumbList");
    expect(types.some((t) => Array.isArray(t) && t.includes("SoftwareApplication"))).toBe(true);
  });

  test("per-item-data moat: strip the workload name and the measurement + boundary remain", async ({ page }) => {
    await page.goto("/specimens/dstackgres");
    const body = (await page.locator("body").textContent()) ?? "";
    const stripped = body.replaceAll("PostgreSQL", "").replaceAll("dstackgres", "");
    expect(stripped).toContain(MEASUREMENT);
    expect(stripped).toContain("allowlist"); // the controlled-egress boundary
  });

  test("both registers render and the resolve target is present", async ({ page }) => {
    await page.goto("/specimens/dstackgres");
    await expect(page.locator("text=Natural predators")).toBeVisible(); // field-guide register
    await expect(page.locator("#boundary")).toBeVisible(); // inspector register
    await expect(page.locator("#resolve")).toContainText('"imageRef"');
  });

  test("the resolve JSON endpoint matches the consumer contract", async ({ request }) => {
    const res = await request.get("/catalog/dstackgres.json");
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
