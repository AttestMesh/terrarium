import { describe, it, expect } from "vitest";
import { getComposeHash, type AppCompose } from "./compose-hash.ts";

describe("compose-hash (dstack-compatible measurement)", () => {
  // The load-bearing test: a known-answer vector captured from dstack's own
  // implementation (sdk/js/src/get-compose-hash.ts). If this drifts, our
  // measurement no longer matches what addComposeHash allowlists at deploy.
  it("matches dstack's cross-language reference vector byte-for-byte", () => {
    const ref: AppCompose = {
      runner: "docker-compose",
      docker_compose_file: "docker-compose.yml",
      text: "你好世界",
      id: "c73a3a4e-ce71-4c12-a1b7-78be1a2e48e0",
      b_number: 123,
      a_status: true,
      z_items: [3, 1, 2],
      nested: { gamma: 3.14, alpha: "first" },
    } as AppCompose;
    expect(getComposeHash(ref)).toBe(
      "0705386656362891629ac994406f4e31ba5c805b9638538df415c56768a504f4",
    );
  });

  it("emits bare lowercase 64-hex (no 0x prefix)", () => {
    const h = getComposeHash({ runner: "docker-compose" });
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is key-order independent (canonicalization)", () => {
    const a: AppCompose = { runner: "docker-compose", docker_compose_file: "x", bash_script: "s" };
    const b: AppCompose = { bash_script: "s", docker_compose_file: "x", runner: "docker-compose" };
    expect(getComposeHash(a)).toBe(getComposeHash(b));
  });

  it("is array-order sensitive (order is significant)", () => {
    expect(getComposeHash({ runner: "x", items: [1, 2, 3] } as AppCompose)).not.toBe(
      getComposeHash({ runner: "x", items: [3, 2, 1] } as AppCompose),
    );
  });

  it("maps NaN/Infinity/undefined consistently to null/absent", () => {
    const nan = getComposeHash({ runner: "x", v: NaN } as AppCompose);
    const inf = getComposeHash({ runner: "x", v: Infinity } as AppCompose);
    const nul = getComposeHash({ runner: "x", v: null } as AppCompose);
    expect(nan).toBe(inf);
    expect(inf).toBe(nul);
  });

  it("applies runner preprocessing only when normalize=true", () => {
    const compose: AppCompose = { runner: "bash", bash_script: "s", docker_compose_file: "x" };
    expect(getComposeHash(compose, true)).not.toBe(getComposeHash(compose, false));
  });
});
