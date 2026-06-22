import { join } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { dir, writeJson, readJson } from "./io.ts";
import { catalogSnapshotSchema, type CatalogSnapshot } from "./schema/observatory.ts";
import type { Integration } from "./schema/catalog.ts";
import type { Tier } from "./schema/build.ts";

const TIER_RANK: Record<Tier, number> = { raw: 0, beta: 1, guarded: 2 };

/** Pure: diff the current catalog against the previous snapshot (additions/promotions/churn). */
export function computeSnapshot(
  integrations: Integration[],
  prev: CatalogSnapshot | null,
  takenAt: string,
): CatalogSnapshot {
  const roster = integrations
    .map((i) => ({ id: i.id, tier: i.tier }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const byTier: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  for (const i of integrations) {
    byTier[i.tier] = (byTier[i.tier] ?? 0) + 1;
    byCategory[i.category] = (byCategory[i.category] ?? 0) + 1;
  }
  const fresh = integrations.filter((i) => i.freshness === "current").length;

  const prevTier = new Map((prev?.roster ?? []).map((r) => [r.id, r.tier]));
  const nowIds = new Set(roster.map((r) => r.id));
  const additions = roster.filter((r) => !prevTier.has(r.id)).map((r) => r.id);
  const churned = [...prevTier.keys()].filter((id) => !nowIds.has(id));
  const promotions = roster
    .filter((r) => prevTier.has(r.id) && TIER_RANK[r.tier] > TIER_RANK[prevTier.get(r.id)!])
    .map((r) => ({ id: r.id, to: r.tier }));

  return catalogSnapshotSchema.parse({
    takenAt,
    counts: { total: integrations.length, byTier, byCategory, fresh, stale: integrations.length - fresh },
    roster,
    additions,
    promotions,
    churned,
  });
}

export function latestSnapshot(): CatalogSnapshot | null {
  if (!existsSync(dir.snapshots)) return null;
  const files = readdirSync(dir.snapshots).filter((f) => f.endsWith(".json")).sort();
  return files.length ? catalogSnapshotSchema.parse(readJson(join(dir.snapshots, files[files.length - 1]))) : null;
}

export function takeSnapshot(integrations: Integration[], takenAt: string): CatalogSnapshot {
  const snap = computeSnapshot(integrations, latestSnapshot(), takenAt);
  writeJson(join(dir.snapshots, `${takenAt.slice(0, 10)}.json`), snap);
  return snap;
}
