import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Browser-free SEO regression guard over the real built artifact. Runs whenever a
// build exists (skipped otherwise). Full rendered-DOM assertions live in
// e2e/specimen.spec.ts (Playwright) for CI; this mirrors them without a browser.
const dist = join(process.cwd(), "dist");
const page = join(dist, "specimens", "dstackgres", "index.html");
const hasBuild = existsSync(page);

describe.skipIf(!hasBuild)("built specimen page SEO contract (dist/)", () => {
  const html = hasBuild ? readFileSync(page, "utf8") : "";

  it("title is generic-keyword-first with the brand in the tail", () => {
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
    expect(title).toMatch(/^Confidential PostgreSQL on Intel TDX — .+ · Terrarium$/);
  });

  it("is self-canonical and indexable", () => {
    expect(html).toMatch(/<link rel="canonical" href="[^"]*\/specimens\/dstackgres\/?"/);
    expect(html).toMatch(/<meta name="robots" content="index, follow"/);
  });

  it("H1 leads with the common name then states the keyword", () => {
    const h1 = html.match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1] ?? "";
    expect(h1).toContain("dstackgres");
    expect(h1).toContain("PostgreSQL");
  });

  it("emits BreadcrumbList + SoftwareApplication JSON-LD", () => {
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toMatch(/"@type":\["SoftwareApplication","SoftwareSourceCode"\]/);
  });

  it("per-item-data moat: the measurement + boundary survive stripping the workload name", () => {
    const stripped = html.replaceAll("PostgreSQL", "").replaceAll("dstackgres", "");
    expect(stripped).toContain("e1eb74c5a2222449ae122ada7935cf6fc9ace1fc0dba53f7f543c60445a97272");
    expect(stripped).toContain("allowlist"); // the (controlled-egress) boundary
  });

  it("lists the real specimen honestly at raw", () => {
    expect(html).toContain("raw");
  });
});

describe.skipIf(!existsSync(join(dist, "catalog", "dstackgres.json")))("served read-API (dist/)", () => {
  it("GET /catalog/:id matches the frozen consumer contract field-set", () => {
    const body = JSON.parse(readFileSync(join(dist, "catalog", "dstackgres.json"), "utf8"));
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
    // honest: no unearned signature on this measurement
    expect(body.tier).toBe("raw");
    expect(body.attestations).toEqual([]);
  });
});
