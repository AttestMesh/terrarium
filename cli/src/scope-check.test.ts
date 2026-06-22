import { describe, it, expect } from "vitest";
import { checkScope, parseNameStatus } from "./scope-check.ts";

describe("path-scoped auto-merge guard", () => {
  it("accepts a purely-additive single new specimen", () => {
    const r = checkScope([
      { status: "A", path: "specimens/redis/specimen.yaml" },
      { status: "A", path: "specimens/redis/boundary.yaml" },
      { status: "A", path: "specimens/redis/docker-compose.yml" },
    ]);
    expect(r).toEqual({ ok: true, id: "redis" });
  });

  it("rejects a workflow/script edit riding along (the dangerous case)", () => {
    const r = checkScope([
      { status: "A", path: "specimens/redis/specimen.yaml" },
      { status: "M", path: ".github/workflows/pr-gates.yml" },
    ]);
    expect(r.ok).toBe(false);
  });

  it("rejects modifying a neighbour specimen", () => {
    const r = checkScope([
      { status: "A", path: "specimens/redis/specimen.yaml" },
      { status: "M", path: "specimens/postgres/boundary.yaml" },
    ]);
    expect(r.ok).toBe(false);
  });

  it("rejects touching two new specimens at once", () => {
    const r = checkScope([
      { status: "A", path: "specimens/redis/specimen.yaml" },
      { status: "A", path: "specimens/qdrant/specimen.yaml" },
    ]);
    expect(r.ok).toBe(false);
  });

  it("rejects a deletion", () => {
    expect(checkScope([{ status: "D", path: "specimens/postgres/specimen.yaml" }]).ok).toBe(false);
  });

  it("parses git --name-status output", () => {
    const changes = parseNameStatus("A\tspecimens/redis/specimen.yaml\nM\t.github/workflows/x.yml");
    expect(changes).toEqual([
      { status: "A", path: "specimens/redis/specimen.yaml" },
      { status: "M", path: ".github/workflows/x.yml" },
    ]);
  });
});

describe("auto-merge is for a NEW specimen, not additions to an existing one", () => {
  const add = (id: string) => [{ status: "A", path: `specimens/${id}/extra.yaml` }];

  it("a purely-additive new specimen passes", () => {
    expect(checkScope(add("redis"), ["postgres", "dstackgres"])).toEqual({ ok: true, id: "redis" });
  });

  it("adding a file under an ALREADY-EXISTING specimen fails", () => {
    const r = checkScope(add("dstackgres"), ["postgres", "dstackgres"]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/already exists/);
  });

  it("two specimens still fail even if both are new", () => {
    const r = checkScope(
      [
        { status: "A", path: "specimens/redis/specimen.yaml" },
        { status: "A", path: "specimens/qdrant/specimen.yaml" },
      ],
      [],
    );
    expect(r.ok).toBe(false);
  });
});
