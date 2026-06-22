import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Browser-free SEO regression guard over the real built artifact. Runs whenever a
// build exists (skipped otherwise, e.g. a fresh checkout). The full rendered-DOM
// assertions live in e2e/specimen.spec.ts (Playwright) for CI; this mirrors them
// without a browser so the contract is checkable anywhere `npm run build` ran.
const dist = join(process.cwd(), "dist");
const page = join(dist, "specimens", "postgres", "index.html");
const hasBuild = existsSync(page);

describe.skipIf(!hasBuild)("built specimen page SEO contract (dist/)", () => {
  const html = hasBuild ? readFileSync(page, "utf8") : "";

  it("title is generic-keyword-first with the brand in the tail", () => {
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
    expect(title).toMatch(/^Confidential PostgreSQL on Intel TDX — .+ · Terrarium$/);
  });

  it("is self-canonical and indexable", () => {
    expect(html).toMatch(/<link rel="canonical" href="[^"]*\/specimens\/postgres\/?"/);
    expect(html).toMatch(/<meta name="robots" content="index, follow"/);
  });

  it("H1 leads with the common name then states the keyword", () => {
    const h1 = html.match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1] ?? "";
    expect(h1).toContain("The Vault Keeper");
    expect(h1).toContain("PostgreSQL");
  });

  it("emits BreadcrumbList + SoftwareApplication JSON-LD", () => {
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toMatch(/"@type":\["SoftwareApplication","SoftwareSourceCode"\]/);
  });

  it("per-item-data moat: measurement + boundary survive stripping the workload name", () => {
    const stripped = html.replaceAll("PostgreSQL", "").replaceAll("postgres", "");
    expect(stripped).toContain("adc1ac8e23769d8f53e1cc44c890932ce32f1579371efedc65e3047d4833ed18");
    expect(stripped).toContain("deny-all");
  });

  it("shows the guarded tier and names the signer", () => {
    expect(html).toContain("guarded");
    expect(html).toContain("flashbots");
  });
});

describe.skipIf(!existsSync(join(dist, "catalog", "postgres.json")))("served read-API (dist/)", () => {
  it("GET /catalog/:id matches the frozen consumer contract field-set", () => {
    const body = JSON.parse(readFileSync(join(dist, "catalog", "postgres.json"), "utf8"));
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
