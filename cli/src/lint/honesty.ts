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
const NO_EGRESS_CLAIMS: RegExp[] = [
  /nothing\s+(?:it\s+holds\s+)?(?:ever\s+)?leaves/i,
  /never\s+leaves(?:\s+the\s+(?:box|enclave))?/i,
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
