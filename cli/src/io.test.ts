import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { selectLatest, recipeWithinSpecimen, cleanGenerated, generatedPublicOutputs, dir } from "./io.ts";
import type { Build } from "./schema/build.ts";

const build = (version: string, builtAt: string, isLatest: boolean) => ({ version, builtAt, isLatest }) as unknown as Build;

describe("selectLatest — read order must not pick the wrong build", () => {
  // read order puts the OLD build first; a naive builds[0] would sign the wrong one
  const builds = [build("v1", "2026-01-01T00:00:00Z", false), build("v2", "2026-02-01T00:00:00Z", true)];

  it("uses the isLatest flag, not the array order", () => {
    expect(selectLatest(builds)?.version).toBe("v2");
  });
  it("honours the latest.json pointer", () => {
    expect(selectLatest(builds, "v2")?.version).toBe("v2");
  });
  it("falls back to newest builtAt when no flag is set", () => {
    const noFlag = [build("v1", "2026-01-01T00:00:00Z", false), build("v2", "2026-02-01T00:00:00Z", false)];
    expect(selectLatest(noFlag)?.version).toBe("v2");
  });
  it("throws when the pointer names a build that doesn't exist", () => {
    expect(() => selectLatest(builds, "v9")).toThrow();
  });
});

describe("recipeWithinSpecimen — recipes can't escape the specimen dir", () => {
  const base = "/repo/specimens/redis";
  it("accepts a path inside the dir", () => expect(recipeWithinSpecimen(base, join(base, "compose.yml"))).toBe(true));
  it("rejects a ../ escape", () => expect(recipeWithinSpecimen(base, join(base, "../postgres/compose.yml"))).toBe(false));
  it("rejects an absolute path outside", () => expect(recipeWithinSpecimen(base, "/etc/passwd")).toBe(false));
  it("rejects the base dir itself", () => expect(recipeWithinSpecimen(base, base)).toBe(false));
});

describe("cleanGenerated — generation starts from a clean set", () => {
  it("removes stale per-id outputs (catalog, badge)", () => {
    const stale = [join(dir.publicApi, "catalog", "__staletest__.json"), join(dir.publicApi, "badge", "__staletest__.svg")];
    for (const p of stale) {
      mkdirSync(join(p, ".."), { recursive: true });
      writeFileSync(p, "stale", "utf8");
    }
    expect(stale.every(existsSync)).toBe(true);
    cleanGenerated();
    expect(stale.some(existsSync)).toBe(false);
  });

  it("covers the previously-missing outputs (badge, measurements, catalog.json)", () => {
    const names = generatedPublicOutputs().map((p) => p.replace(`${dir.publicApi}/`, ""));
    expect(names).toEqual(
      expect.arrayContaining(["catalog", "catalog.json", "reviewers.json", "measurements", "integrations", "badge"]),
    );
  });
});
