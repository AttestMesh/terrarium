import { join } from "node:path";
import { listSpecimenIds, readSpecimen, readBuilds, readLatestBuild, readAttestations, readReviewers, readAdvisories, readUpstreamState, writeJson, dir } from "./io.ts";
import { honestyLint } from "./lint/honesty.ts";
import { boundaryLint, imagePinLint } from "./lint/boundary.ts";
import { composeImages } from "./measurement.ts";
import { deriveSeo } from "./derive/seo.ts";
import { deriveLore, deriveProofTier, deriveTier } from "./derive/facts.ts";
import { verifiedAttestations } from "./trust.ts";
import { deriveFreshness } from "./derive/freshness.ts";
import { integrationSchema, type Integration, type Publisher } from "./schema/catalog.ts";
import type { Specimen } from "./schema/specimen.ts";

/** Publisher identity = the GitHub PR author; first-party seeds are labelled verified. */
function publisherFor(specimen: Specimen): Publisher {
  const org = specimen.upstream.repo.split("/")[1] ?? "community";
  const firstParty = org === "terrarium-registry";
  return { githubId: org, name: org, kind: firstParty ? "first-party" : "community", verified: firstParty };
}

/** Read-only join: specimens × latest build × attestations(by measurement) → Integration[]. */
export function computeIntegrations(): Integration[] {
  const allAttestations = readAttestations();
  const reviewers = readReviewers();
  const advisories = readAdvisories();
  const upstream = readUpstreamState();
  const integrations: Integration[] = [];

  for (const id of listSpecimenIds()) {
    const { specimen, boundary, fieldGuide, recipeText } = readSpecimen(id);
    const builds = readBuilds(id);
    const latest = readLatestBuild(id);
    if (!latest) continue; // not yet reproduced (Gate 0) → not listed at any tier

    const lintsPass =
      honestyLint(fieldGuide, boundary).length === 0 &&
      boundaryLint(specimen, boundary).length === 0 &&
      imagePinLint(composeImages(recipeText)).length === 0;
    // Only verified active-reviewer valid signatures over THIS measurement count.
    const atts = verifiedAttestations(allAttestations, reviewers, latest.measurement);
    const tier = deriveTier({
      reproducible: latest.reproducible,
      lintsPass,
      hasUsageSignal: false, // usage threshold wiring is M2
      validAttestations: atts.length,
    });
    const freshness = deriveFreshness({
      measurement: latest.measurement.value,
      pinnedRef: latest.upstreamRef,
      latestRelease: upstream[id]?.latestRelease,
      advisories,
    });
    const versions = [...builds]
      .sort((a, b) => b.builtAt.localeCompare(a.builtAt))
      .map((b) => {
        const isLatest = b.version === latest.version; // tied to the selected current build
        return {
          version: b.version,
          measurement: b.measurement,
          builtAt: b.builtAt,
          freshness: isLatest ? freshness : ("behind" as const), // superseded builds are behind
          isLatest,
        };
      });

    integrations.push(
      integrationSchema.parse({
        id,
        commonName: specimen.commonName,
        category: specimen.category,
        role: specimen.role,
        publisher: publisherFor(specimen),
        tier,
        proofTier: deriveProofTier(boundary),
        freshness,
        costHint: specimen.flavorHint,
        latestBuild: latest,
        versions,
        attestations: atts,
        fieldGuide,
        lore: deriveLore(specimen, boundary, latest),
        seo: deriveSeo(specimen),
        plate: specimen.plate ?? null,
        range: null, // network telemetry — null until wired, never authored
      } satisfies Integration),
    );
  }
  return integrations;
}

/** Compute the join and persist the index artifacts (for inspection / debugging). */
export function buildIndex(): Integration[] {
  const integrations = computeIntegrations();
  writeJson(join(dir.index, "catalog.json"), integrations);
  const byCategory: Record<string, string[]> = {};
  for (const i of integrations) (byCategory[i.category] ??= []).push(i.id);
  writeJson(join(dir.index, "categories.json"), byCategory);
  writeJson(join(dir.index, "reviewers.json"), readReviewers());
  return integrations;
}
