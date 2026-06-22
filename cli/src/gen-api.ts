import { join } from "node:path";
import { existsSync } from "node:fs";
import { dir, writeJson, readJsonl, readReviewers, writeText } from "./io.ts";
import { computeIntegrations } from "./build-index.ts";
import { catalogResolveSchema, logEntrySchema, type Integration, type CatalogResolve, type LogEntry } from "./schema/catalog.ts";

/** The exact GET /catalog/:id object the control plane resolves at deploy time. */
function resolveOf(i: Integration): CatalogResolve {
  return catalogResolveSchema.parse({
    imageRef: i.latestBuild.imageRef,
    measurement: i.latestBuild.measurement,
    boundarySpec: i.latestBuild.boundarySpec,
    attestations: i.attestations,
    tier: i.tier,
    proofTier: i.proofTier,
    freshness: i.freshness,
    publisher: i.publisher,
  });
}

const TIER_COLOR: Record<string, string> = { guarded: "#2c4f3a", beta: "#b4791f", raw: "#6b6760" };

/** A shields.io-shaped embeddable badge — asserts only what the record verifies. */
function badgeSvg(label: string, value: string, color: string): string {
  const lw = 8 + label.length * 6.2;
  const vw = 8 + value.length * 6.2;
  const w = lw + vw;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${label}: ${value}">
  <rect width="${w}" height="20" fill="#555"/>
  <rect x="${lw}" width="${vw}" height="20" fill="${color}"/>
  <g fill="#fff" font-family="Verdana,Geneva,sans-serif" font-size="11">
    <text x="${lw / 2}" y="14" text-anchor="middle">${label}</text>
    <text x="${lw + vw / 2}" y="14" text-anchor="middle">${value}</text>
  </g>
</svg>
`;
}

/** Group the signed log into a per-measurement transparency record (GET /measurements/:hash). */
function measurementRecords(): Map<string, unknown> {
  const path = join(dir.log, "measurements.jsonl");
  const out = new Map<string, unknown>();
  if (!existsSync(path)) return out;
  const entries = readJsonl(path).map((e) => logEntrySchema.parse(e)) as LogEntry[];
  const byMeasurement = new Map<string, LogEntry[]>();
  for (const e of entries) {
    const arr = byMeasurement.get(e.measurement.value) ?? [];
    arr.push(e);
    byMeasurement.set(e.measurement.value, arr);
  }
  for (const [value, es] of byMeasurement) {
    const signers = [...new Set(es.flatMap((e) => e.signers))];
    out.set(value, {
      measurement: es[0].measurement,
      integrationId: es[0].integrationId,
      source: es[0].source,
      rebuilders: Math.max(...es.map((e) => e.rebuilders)),
      reproducible: true,
      signers,
      revocations: es.flatMap((e) => e.revocations),
      timeline: es.flatMap((e) => e.timeline).sort((a, b) => a.at.localeCompare(b.at)),
      logSeqs: es.map((e) => e.seq),
    });
  }
  return out;
}

/** Emit the static read-API into ./public (served verbatim by Astro). */
export function genApi(): Integration[] {
  const integrations = computeIntegrations();
  const measurements = measurementRecords();

  writeJson(join(dir.publicApi, "catalog.json"), integrations); // GET /catalog
  writeJson(join(dir.publicApi, "reviewers.json"), readReviewers()); // GET /reviewers

  for (const i of integrations) {
    writeJson(join(dir.publicApi, "catalog", `${i.id}.json`), resolveOf(i)); // GET /catalog/:id
    writeJson(join(dir.publicApi, "integrations", i.id, "freshness.json"), {
      integrationId: i.id,
      certifiedBuild: i.latestBuild.upstreamRef,
      status: i.freshness,
      versions: [
        { version: i.latestBuild.version, measurement: i.latestBuild.measurement.value, freshness: i.latestBuild.freshness },
      ],
    });
    // embeddable trust badge
    writeText(
      join(dir.publicApi, "badge", `${i.id}.svg`),
      badgeSvg("terrarium", `${i.tier} · reproduces`, TIER_COLOR[i.tier] ?? "#6b6760"),
    );
  }

  // GET /measurements/:hash — the signed-log transparency record
  for (const [value, record] of measurements) {
    writeJson(join(dir.publicApi, "measurements", `${value}.json`), record);
  }
  return integrations;
}
