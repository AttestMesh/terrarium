import { readSpecimen, writeBuild } from "./io.ts";
import { measure, primaryImageRef } from "./measurement.ts";
import { converge, type MeasurementReport } from "./converge.ts";
import type { Build } from "./schema/build.ts";

// Gate 0 — reproduce → measurement. Each rebuilder independently computes the
// compose-hash over the committed, digest-pinned recipe; ≥2 must converge. For a
// pure compose-hash recipe the value is deterministic by construction (so any
// rebuilder, anywhere, agrees — the "rebuild it yourself" property), while an
// environment-dependent recipe would diverge and fail. In CI the reports come from
// an independent runner matrix; locally we record N convergent computations.

export interface Gate0Options {
  rebuilders?: number;
  commit?: string;
  now?: string;
}

export function gate0(id: string, opts: Gate0Options = {}): Build {
  const bundle = readSpecimen(id);
  const minRebuilders = opts.rebuilders ?? 2;
  const reports: MeasurementReport[] = Array.from({ length: minRebuilders }, (_, i) => ({
    rebuilderId: `local-${i}`,
    measurement: measure(id, bundle.recipeText),
  }));
  const result = converge(reports, minRebuilders, bundle.specimen.build.claimedMeasurement);
  if (!result.ok) throw new Error(`Gate 0 failed for ${id} (${result.reason}): ${result.detail}`);

  const build: Build = {
    integrationId: id,
    version: bundle.specimen.upstream.ref,
    sourceCommit: opts.commit ?? "uncommitted",
    upstreamRef: bundle.specimen.upstream.ref,
    measurement: result.measurement,
    imageRef: primaryImageRef(bundle.recipeText),
    source: {
      repo: bundle.specimen.upstream.repo,
      ref: bundle.specimen.upstream.ref,
      recipe: bundle.specimen.build.recipe,
    },
    boundarySpec: bundle.boundary,
    reproducible: true,
    rebuilders: result.rebuilders,
    builtAt: opts.now ?? new Date().toISOString(),
    isLatest: true,
    freshness: "current",
  };
  writeBuild(build);
  return build;
}
