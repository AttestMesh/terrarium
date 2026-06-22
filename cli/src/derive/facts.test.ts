import { describe, it, expect } from "vitest";
import { deriveProofTier, deriveTier, attestationsForMeasurement } from "./facts.ts";
import type { BoundarySpec } from "../schema/specimen.ts";
import type { Attestation } from "../schema/build.ts";

const bnd = (policy: "deny-all" | "allowlist", sealed: boolean): BoundarySpec => ({
  sealedVolumes: sealed ? ["/data"] : [],
  raTlsSurfaces: [],
  egress: { monitor: "warden@1", policy, allowlist: policy === "allowlist" ? [{ host: "x", pin: "y" }] : [] },
  secrets: {},
  logRedaction: {},
});

describe("proofTier reflects the boundary shape (independent of certification)", () => {
  it("deny-all + sealed-at-rest → sealed", () => expect(deriveProofTier(bnd("deny-all", true))).toBe("sealed"));
  it("allowlist (pinned, logged egress) → accountable", () => expect(deriveProofTier(bnd("allowlist", true))).toBe("accountable"));
  it("deny-all + unsealed → open", () => expect(deriveProofTier(bnd("deny-all", false))).toBe("open"));
});

describe("tier ladder", () => {
  it("raw when reproducible only", () =>
    expect(deriveTier({ reproducible: true, lintsPass: true, hasUsageSignal: false, validAttestations: 0 })).toBe("raw"));
  it("beta when lints pass + a usage signal", () =>
    expect(deriveTier({ reproducible: true, lintsPass: true, hasUsageSignal: true, validAttestations: 0 })).toBe("beta"));
  it("guarded when ≥1 valid attestation", () =>
    expect(deriveTier({ reproducible: true, lintsPass: true, hasUsageSignal: true, validAttestations: 1 })).toBe("guarded"));
});

describe("guarded never carries across a rebuild — join by measurement, not by id", () => {
  const OLD = "a".repeat(64);
  const NEW = "b".repeat(64);
  const att = (value: string): Attestation => ({
    buildRef: "postgres@v16.3-cvm1",
    measurement: { kind: "compose-hash", value },
    reviewerId: "first-party",
    scope: "boundary",
    signature: "abcd",
    issuedAt: "2026-06-22T00:00:00Z",
    status: "valid",
  });

  it("an attestation over the OLD measurement does NOT apply to a NEW build", () => {
    expect(attestationsForMeasurement([att(OLD)], { kind: "compose-hash", value: NEW })).toHaveLength(0);
  });
  it("applies only to the exact matching measurement", () => {
    expect(attestationsForMeasurement([att(OLD)], { kind: "compose-hash", value: OLD })).toHaveLength(1);
  });
  it("a revoked attestation is ignored even on a match", () => {
    expect(attestationsForMeasurement([{ ...att(OLD), status: "revoked" }], { kind: "compose-hash", value: OLD })).toHaveLength(0);
  });
});
