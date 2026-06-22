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
