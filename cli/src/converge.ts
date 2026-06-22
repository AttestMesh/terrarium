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
  | { ok: false; reason: "insufficient" | "divergent" | "mismatch"; detail: string };

export function converge(
  reports: MeasurementReport[],
  minRebuilders: number,
  claimed?: string,
): ConvergeResult {
  if (reports.length < minRebuilders) {
    return { ok: false, reason: "insufficient", detail: `${reports.length} rebuilder(s) < required ${minRebuilders}` };
  }
  const values = new Set(reports.map((r) => r.measurement.value));
  if (values.size !== 1) {
    return { ok: false, reason: "divergent", detail: `rebuilders diverged: ${[...values].join(" vs ")}` };
  }
  const measurement = reports[0].measurement;
  if (claimed && claimed !== measurement.value) {
    return { ok: false, reason: "mismatch", detail: `claimed ${claimed} != computed ${measurement.value}` };
  }
  return { ok: true, measurement, rebuilders: reports.length };
}
