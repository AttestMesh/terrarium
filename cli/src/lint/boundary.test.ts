import { describe, it, expect } from "vitest";
import { imagePinLint } from "./boundary.ts";

describe("image-digest-pinning lint", () => {
  it("flags a tag-pinned image", () => {
    const f = imagePinLint(["ghcr.io/teesql/teesql-postgres:v1.2.0"]);
    expect(f).toHaveLength(1);
    expect(f[0].rule).toBe("image-digest-pinned");
  });

  it("passes a digest-pinned image", () => {
    expect(imagePinLint([`postgres@sha256:${"a".repeat(64)}`])).toHaveLength(0);
  });

  it("flags only the unpinned images in a multi-service compose", () => {
    const f = imagePinLint(["a:1", `b@sha256:${"b".repeat(64)}`, "c:2"]);
    expect(f).toHaveLength(2);
  });
});
