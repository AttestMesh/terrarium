import { describe, it, expect } from "vitest";
import { isBehind, deriveFreshness, type Advisory } from "./freshness.ts";

describe("isBehind — pinned ref vs latest upstream release", () => {
  it("behind when upstream advanced a minor", () => expect(isBehind("v16.3-cvm1", "v16.4")).toBe(true));
  it("behind across a major", () => expect(isBehind("v16.3", "v17.0")).toBe(true));
  it("current when equal", () => expect(isBehind("v16.3", "16.3.0")).toBe(false));
  it("current when pinned is newer", () => expect(isBehind("v16.3", "v16.2")).toBe(false));
  it("not behind when upstream is unknown", () => expect(isBehind("v16.3", null)).toBe(false));
});

describe("deriveFreshness", () => {
  const M = "a".repeat(64);
  const advisories: Advisory[] = [{ measurement: M, cve: "CVE-2026-0001", severity: "high" }];

  it("cve when this measurement has a published advisory (wins over everything)", () => {
    expect(deriveFreshness({ measurement: M, pinnedRef: "v16.3", latestRelease: "v16.3", advisories })).toBe("cve");
  });
  it("behind when upstream moved and no advisory", () => {
    expect(deriveFreshness({ measurement: "b".repeat(64), pinnedRef: "v16.3", latestRelease: "v17.0", advisories: [] })).toBe("behind");
  });
  it("current otherwise", () => {
    expect(deriveFreshness({ measurement: "b".repeat(64), pinnedRef: "v16.3", latestRelease: "v16.3", advisories: [] })).toBe("current");
  });
});
