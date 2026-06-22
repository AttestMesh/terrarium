import { describe, it, expect } from "vitest";
import { catalogResolveSchema } from "./schema/catalog.ts";

// The control plane reads GET /catalog/:id at deploy. If this field set drifts, the
// consumer breaks silently — so the contract is frozen here.
describe("consumer resolve contract (GET /catalog/:id) is frozen", () => {
  it("has exactly the eight agreed fields", () => {
    expect(Object.keys(catalogResolveSchema.shape).sort()).toEqual([
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
