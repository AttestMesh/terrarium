import type { Measurement } from "./schema/primitives.ts";

// The measurement is adversarial, not oracular: a submission counts as *reproduced*
// only when ≥2 independent rebuilders converge on one value. A recipe that fakes an
// environment-dependent measurement diverges across rebuilders and fails here by
// construction — our CI is never the trusted oracle.

export interface MeasurementReport {
  rebuilderId: string;
  measurement: Measurement;
}

export type ConvergeResult =
  | { ok: true; measurement: Measurement; rebuilders: number }
  | { ok: false; reason: "insufficient" | "divergent" | "mismatch" | "inconsistent"; detail: string };

export function converge(
  reports: MeasurementReport[],
  minRebuilders: number,
  claimed?: string,
): ConvergeResult {
  // Group by rebuilderId: quorum must come from DISTINCT rebuilders, not N reports
  // from one (which proves nothing independent). A rebuilder that reports two
  // different measurements contradicts itself and fails clearly.
  const byRebuilder = new Map<string, Set<string>>();
  for (const r of reports) {
    const set = byRebuilder.get(r.rebuilderId) ?? new Set<string>();
    set.add(r.measurement.value);
    byRebuilder.set(r.rebuilderId, set);
  }
  for (const [id, vals] of byRebuilder) {
    if (vals.size > 1) {
      return { ok: false, reason: "inconsistent", detail: `rebuilder "${id}" reported ${vals.size} different measurements: ${[...vals].join(" vs ")}` };
    }
  }

  const distinct = byRebuilder.size;
  if (distinct < minRebuilders) {
    return { ok: false, reason: "insufficient", detail: `${distinct} distinct rebuilder(s) < required ${minRebuilders}` };
  }
  const values = new Set(reports.map((r) => r.measurement.value));
  if (values.size !== 1) {
    return { ok: false, reason: "divergent", detail: `rebuilders diverged: ${[...values].join(" vs ")}` };
  }
  const measurement = reports[0].measurement;
  if (claimed && claimed !== measurement.value) {
    return { ok: false, reason: "mismatch", detail: `claimed ${claimed} != computed ${measurement.value}` };
  }
  return { ok: true, measurement, rebuilders: distinct };
}
