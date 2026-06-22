import { describe, it, expect } from "vitest";
import { deriveProofTier, deriveTier } from "./facts.ts";
import type { BoundarySpec } from "../schema/specimen.ts";

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
  it("guarded when reproducible + lints pass + ≥1 verified attestation", () =>
    expect(deriveTier({ reproducible: true, lintsPass: true, hasUsageSignal: true, validAttestations: 1 })).toBe("guarded"));
});

describe("certification cannot bypass the base gates", () => {
  it("a valid signature CANNOT make a NON-reproducible build guarded", () =>
    expect(deriveTier({ reproducible: false, lintsPass: true, hasUsageSignal: false, validAttestations: 3 })).toBe("raw"));
  it("a valid signature CANNOT make a LINT-FAILING build guarded", () =>
    expect(deriveTier({ reproducible: true, lintsPass: false, hasUsageSignal: false, validAttestations: 3 })).toBe("raw"));
});
