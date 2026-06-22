import type { BoundarySpec, FieldGuide } from "../schema/specimen.ts";

export interface LintFinding {
  rule: string;
  field: string;
  message: string;
}

// Gate-1 honesty lint: an authored line may not assert what the boundary spec
// contradicts. A `fieldNote: "nothing leaves"` is rejected unless egress is deny-all.
// Kept as a small, unit-tested rule table so every leak a reviewer finds becomes one
// more entry (the spec's self-improving lints).
// Match only TOTALIZING egress claims ("nothing/no data leaves|escapes"). A bare
// "never leaves" is intentionally NOT here: it false-positives on confidentiality
// claims about a specific thing (e.g. "the key never leaves enclave memory"), which
// is not a claim that the workload makes no outbound calls. (Caught by dstackgres.)
const NO_EGRESS_CLAIMS: RegExp[] = [
  /nothing\s+(?:it\s+holds\s+)?(?:ever\s+)?leaves/i,
  /no(?:thing)?\s+data\s+(?:ever\s+)?leaves/i,
  /nothing\s+(?:ever\s+)?escapes/i,
  /no\s+egress/i,
  /does\s+not\s+(?:phone|call|reach)\s+(?:home|out)/i,
];

export function assertsNoEgress(text: string): boolean {
  return NO_EGRESS_CLAIMS.some((re) => re.test(text));
}

export function honestyLint(fieldGuide: FieldGuide, boundary: BoundarySpec): LintFinding[] {
  const findings: LintFinding[] = [];
  if (boundary.egress.policy !== "deny-all") {
    for (const field of ["fieldNote", "description"] as const) {
      if (assertsNoEgress(fieldGuide[field])) {
        findings.push({
          rule: "honest-egress",
          field,
          message: `${field} asserts nothing leaves, but egress.policy is "${boundary.egress.policy}"`,
        });
      }
    }
  }
  return findings;
}
