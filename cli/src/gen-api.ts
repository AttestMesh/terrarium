import { join } from "node:path";
import { dir, writeJson, readReviewers } from "./io.ts";
import { computeIntegrations } from "./build-index.ts";
import { catalogResolveSchema, type Integration, type CatalogResolve } from "./schema/catalog.ts";

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

/** Emit the static read-API into ./public (served verbatim by Astro). */
export function genApi(): Integration[] {
  const integrations = computeIntegrations();

  writeJson(join(dir.publicApi, "catalog.json"), integrations); // GET /catalog
  writeJson(join(dir.publicApi, "reviewers.json"), readReviewers()); // GET /reviewers

  for (const i of integrations) {
    writeJson(join(dir.publicApi, "catalog", `${i.id}.json`), resolveOf(i)); // GET /catalog/:id
    writeJson(join(dir.publicApi, "integrations", i.id, "freshness.json"), {
      integrationId: i.id,
      certifiedBuild: i.latestBuild.upstreamRef,
      status: i.freshness,
      versions: [
        {
          version: i.latestBuild.version,
          measurement: i.latestBuild.measurement.value,
          freshness: i.latestBuild.freshness,
        },
      ],
    });
  }
  return integrations;
}
