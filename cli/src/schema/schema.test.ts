import { describe, it, expect } from "vitest";
import { specimenSchema, boundarySpecSchema, fieldGuideSchema } from "./specimen.ts";
import { measurementSchema, composeHashSchema, isoDateSchema } from "./primitives.ts";
import { catalogResolveSchema } from "./catalog.ts";

const validSpecimen = {
  id: "postgres",
  commonName: "The Vault Keeper",
  category: "sealed-datastore",
  role: "stateful-db",
  upstream: { repo: "github.com/org/postgres-cvm", ref: "v16.3-cvm1" },
  build: { recipe: "./docker-compose.yml" },
  ingress: [{ port: 5432, protocol: "ra-tls" }],
  flavorHint: "tdx.small",
};

describe("authored schemas enforce authored-vs-derived structurally", () => {
  it("accepts a well-formed specimen", () => {
    expect(specimenSchema.parse(validSpecimen).id).toBe("postgres");
  });

  it("rejects a smuggled derived field (measurement) via .strict()", () => {
    const r = specimenSchema.safeParse({ ...validSpecimen, measurement: "a".repeat(64) });
    expect(r.success).toBe(false);
  });

  it("rejects a smuggled tier via .strict()", () => {
    const r = specimenSchema.safeParse({ ...validSpecimen, tier: "guarded" });
    expect(r.success).toBe(false);
  });
});

describe("boundary egress honesty is enforced at the schema level", () => {
  const base = { sealedVolumes: ["/data"], raTlsSurfaces: [5432] };

  it("accepts deny-all with an empty allowlist", () => {
    const r = boundarySpecSchema.safeParse({
      ...base,
      egress: { monitor: "warden@1", policy: "deny-all", allowlist: [] },
      secrets: { superuser: "born-in-box" },
    });
    expect(r.success).toBe(true);
  });

  it("rejects deny-all with a non-empty allowlist", () => {
    const r = boundarySpecSchema.safeParse({
      ...base,
      egress: { monitor: "warden@1", policy: "deny-all", allowlist: [{ host: "rpc.example" }] },
    });
    expect(r.success).toBe(false);
  });

  it("accepts allowlist policy with pinned hosts", () => {
    const r = boundarySpecSchema.safeParse({
      ...base,
      egress: {
        monitor: "warden@1",
        policy: "allowlist",
        allowlist: [{ host: "rpc.example", pin: "sha256:abc" }],
      },
    });
    expect(r.success).toBe(true);
  });
});

describe("primitives", () => {
  it("measurement value is bare 64-hex, not 0x-prefixed", () => {
    expect(composeHashSchema.safeParse("a".repeat(64)).success).toBe(true);
    expect(composeHashSchema.safeParse("0x" + "a".repeat(64)).success).toBe(false);
  });

  it("measurement defaults kind to compose-hash", () => {
    expect(measurementSchema.parse({ value: "b".repeat(64) }).kind).toBe("compose-hash");
  });

  it("isoDate accepts ISO-8601 and rejects junk", () => {
    expect(isoDateSchema.safeParse("2026-06-22T00:00:00Z").success).toBe(true);
    expect(isoDateSchema.safeParse("not-a-date").success).toBe(false);
  });
});

describe("field guide voice caps", () => {
  it("rejects an over-long description", () => {
    const r = fieldGuideSchema.safeParse({ description: "x".repeat(401), fieldNote: "ok" });
    expect(r.success).toBe(false);
  });
});

describe("consumer resolve contract is closed (no field drift)", () => {
  it("rejects an unexpected extra key", () => {
    const valid = {
      imageRef: "postgres@sha256:" + "a".repeat(64),
      measurement: { kind: "compose-hash", value: "a".repeat(64) },
      boundarySpec: {
        sealedVolumes: [],
        raTlsSurfaces: [],
        egress: { monitor: "warden@1", policy: "deny-all", allowlist: [] },
        secrets: {},
        logRedaction: {},
      },
      attestations: [],
      tier: "raw",
      proofTier: "open",
      freshness: "current",
      publisher: { githubId: "org", name: "Org", kind: "community", verified: false },
    };
    expect(catalogResolveSchema.safeParse(valid).success).toBe(true);
    expect(catalogResolveSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false);
  });
});
