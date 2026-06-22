import { describe, it, expect } from "vitest";
import { computeSnapshot } from "./snapshot.ts";
import type { Integration } from "./schema/catalog.ts";
import type { CatalogSnapshot } from "./schema/observatory.ts";

// computeSnapshot only reads id/tier/category/freshness — minimal fixtures suffice.
const I = (id: string, tier: string, category = "sealed-datastore", freshness = "current") =>
  ({ id, tier, category, freshness }) as unknown as Integration;

describe("catalog snapshot diff (the observatory time-series)", () => {
  it("first snapshot: everything is an addition", () => {
    const s = computeSnapshot([I("postgres", "guarded"), I("redis", "raw")], null, "2026-06-22T00:00:00Z");
    expect(s.counts.total).toBe(2);
    expect(s.counts.byTier).toEqual({ guarded: 1, raw: 1 });
    expect(s.additions.sort()).toEqual(["postgres", "redis"]);
    expect(s.promotions).toEqual([]);
    expect(s.churned).toEqual([]);
  });

  it("second snapshot: detects additions, promotions, and churn", () => {
    const prev = computeSnapshot([I("postgres", "raw"), I("redis", "raw")], null, "2026-06-01T00:00:00Z") as CatalogSnapshot;
    const now = computeSnapshot(
      [I("postgres", "guarded"), I("qdrant", "raw")], // redis gone, qdrant new, postgres promoted
      prev,
      "2026-06-22T00:00:00Z",
    );
    expect(now.additions).toEqual(["qdrant"]);
    expect(now.churned).toEqual(["redis"]);
    expect(now.promotions).toEqual([{ id: "postgres", to: "guarded" }]);
  });

  it("counts freshness as fresh vs stale", () => {
    const s = computeSnapshot([I("a", "raw", "sealed-datastore", "current"), I("b", "raw", "sealed-datastore", "behind")], null, "2026-06-22T00:00:00Z");
    expect(s.counts.fresh).toBe(1);
    expect(s.counts.stale).toBe(1);
  });
});
