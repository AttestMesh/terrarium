import { describe, it, expect } from "vitest";
import { converge, type MeasurementReport } from "./converge.ts";

const A = "a".repeat(64);
const B = "b".repeat(64);
const rep = (id: string, value: string): MeasurementReport => ({ rebuilderId: id, measurement: { kind: "compose-hash", value } });

describe("converge — the measurement is adversarial, not oracular", () => {
  it("converges when ≥2 independent rebuilders agree", () => {
    const r = converge([rep("x", A), rep("y", A)], 2);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rebuilders).toBe(2);
  });

  it("FAILS BY CONSTRUCTION when an env-dependent recipe diverges across rebuilders", () => {
    const r = converge([rep("x", A), rep("y", B)], 2);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("divergent");
  });

  it("fails when fewer than the required rebuilders report (no single-runner oracle)", () => {
    const r = converge([rep("x", A)], 2);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("insufficient");
  });

  it("fails when the converged value != the contributor's claimed measurement", () => {
    const r = converge([rep("x", A), rep("y", A)], 2, B);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("mismatch");
  });
});

describe("converge — quorum requires DISTINCT rebuilders", () => {
  it("duplicate rebuilder ids do not satisfy quorum (3 reports, 1 rebuilder)", () => {
    const r = converge([rep("x", A), rep("x", A), rep("x", A)], 2);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("insufficient");
  });

  it("the same rebuilder reporting two different measurements fails clearly", () => {
    const r = converge([rep("x", A), rep("x", B), rep("y", A)], 2);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("inconsistent");
  });

  it("counts DISTINCT rebuilders, ignoring duplicates, when they agree", () => {
    const r = converge([rep("x", A), rep("x", A), rep("y", A)], 2);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rebuilders).toBe(2);
  });
});
