import type { Specimen, BoundarySpec, Category } from "../schema/specimen.ts";
import type { LintFinding } from "./honesty.ts";

// Gate-1 structural boundary lints — automated leak-surface checks. Self-improving:
// each new class of leak a reviewer finds is added here, shrinking Gate-2 human review.

// Each category carries a characteristic egress shape; a mismatch means the declared
// category and the boundary disagree (the taxonomy must stay coherent).
const EXPECTED_EGRESS: Record<Category, "deny-all" | "allowlist"> = {
  "sealed-datastore": "deny-all",
  "confidential-compute": "deny-all",
  "controlled-egress-gateway": "allowlist",
  "agent-runtime": "allowlist",
};

export function boundaryLint(specimen: Specimen, boundary: BoundarySpec): LintFinding[] {
  const findings: LintFinding[] = [];
  const { egress } = boundary;

  // category ⇄ egress coherence
  const expected = EXPECTED_EGRESS[specimen.category];
  if (egress.policy !== expected) {
    findings.push({
      rule: "category-egress-coherence",
      field: "egress.policy",
      message: `category "${specimen.category}" expects egress "${expected}", found "${egress.policy}"`,
    });
  }

  // every allowlisted destination must be cert-pinned (an unpinned host can be MITM'd)
  if (egress.policy === "allowlist") {
    for (const dest of egress.allowlist) {
      if (!dest.pin) {
        findings.push({
          rule: "egress-pinned",
          field: "egress.allowlist",
          message: `allowlisted host "${dest.host}" is not cert-pinned`,
        });
      }
    }
  }

  // a sealed datastore must actually seal state at rest
  if (specimen.category === "sealed-datastore" && boundary.sealedVolumes.length === 0) {
    findings.push({
      rule: "sealed-state",
      field: "sealedVolumes",
      message: "a sealed datastore declares no sealed volumes — state would touch host-visible storage",
    });
  }

  // every RA-TLS ingress port must be declared as an RA-TLS surface
  for (const ing of specimen.ingress) {
    if (ing.protocol === "ra-tls" && !boundary.raTlsSurfaces.includes(ing.port)) {
      findings.push({
        rule: "ratls-surface",
        field: "raTlsSurfaces",
        message: `ingress port ${ing.port} is ra-tls but not listed in raTlsSurfaces`,
      });
    }
  }

  return findings;
}
