import { describe, it, expect } from "vitest";
import { honestyLint } from "./honesty.ts";
import type { BoundarySpec, FieldGuide } from "../schema/specimen.ts";

const fg = (fieldNote: string, description = "A solitary daemon."): FieldGuide => ({ fieldNote, description });
const boundary = (policy: "deny-all" | "allowlist", allowlist: { host: string; pin?: string }[] = []): BoundarySpec =>
  ({ sealedVolumes: [], raTlsSurfaces: [], egress: { monitor: "warden@1", policy, allowlist }, secrets: {}, logRedaction: {} });

describe("honesty lint — authored prose may not contradict the boundary", () => {
  it("rejects 'nothing leaves' when egress is an allowlist (the spec's worked example)", () => {
    const f = honestyLint(fg("nothing leaves the box"), boundary("allowlist", [{ host: "rpc.x", pin: "sha256:y" }]));
    expect(f).toHaveLength(1);
    expect(f[0].rule).toBe("honest-egress");
    expect(f[0].field).toBe("fieldNote");
  });

  it("passes the same note when egress is deny-all", () => {
    expect(honestyLint(fg("nothing leaves the box"), boundary("deny-all"))).toHaveLength(0);
  });

  it("passes the real Postgres field note (asserts no egress claim)", () => {
    expect(honestyLint(fg("Nothing it holds is hidden; no one commands it."), boundary("deny-all"))).toHaveLength(0);
  });

  it("flags a dishonest description too", () => {
    const f = honestyLint(fg("ok", "no data ever leaves"), boundary("allowlist", [{ host: "x", pin: "y" }]));
    expect(f.some((x) => x.field === "description")).toBe(true);
  });
});
