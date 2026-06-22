import type { Specimen, BoundarySpec, Category } from "../schema/specimen.ts";
import type { Measurement } from "../schema/primitives.ts";
import type { Attestation, Build, Tier, ProofTier } from "../schema/build.ts";
import type { Lore } from "../schema/catalog.ts";

// Pure derivation: the verified record → the field-guide lore + the trust tier.
// Every function here is side-effect-free so it is directly unit-testable.

export function deriveHabitat(_flavorHint?: string): string {
  return "Intel TDX · dstack";
}

export function deriveDiet(specimen: Specimen): string[] {
  return specimen.ingress.map((i) => `${i.protocol.toUpperCase()} on :${i.port}`);
}

const PREDATORS_BY_CATEGORY: Record<Category, string[]> = {
  "sealed-datastore": ["a host reading state at rest", "a malicious co-tenant", "a snapshot exfiltrated to the host"],
  "confidential-compute": ["a swapped model/checkpoint", "telemetry that ships inputs", "host inspection of RAM"],
  "controlled-egress-gateway": ["an over-broad egress allowlist", "an unpinned upstream that can be MITM'd"],
  "agent-runtime": ["tool-call egress as a leak surface", "an un-attested downstream endpoint (trust laundering)"],
};

export function derivePredators(category: Category, boundary: BoundarySpec): string[] {
  const preds = [...PREDATORS_BY_CATEGORY[category]];
  // Honest ceiling: if it must egress, a network MITM is always in the threat model.
  if (boundary.egress.policy === "allowlist") preds.push("a network MITM on the pinned egress path");
  return preds;
}

export function deriveMarkings(measurement: Measurement, rebuilders: number, reproducible: boolean): string {
  const repro = reproducible ? `reproduces — ${rebuilders} rebuilders agree` : "not yet reproduced";
  return `${measurement.kind} ${measurement.value.slice(0, 12)}… (${repro})`;
}

export function deriveLore(specimen: Specimen, boundary: BoundarySpec, build: Build): Lore {
  return {
    habitat: deriveHabitat(specimen.flavorHint),
    diet: deriveDiet(specimen),
    markings: deriveMarkings(build.measurement, build.rebuilders, build.reproducible),
    predators: derivePredators(specimen.category, boundary),
  };
}

/**
 * proofTier describes the *boundary shape* (what the manifest claims), independent
 * of whether a reviewer signed it: allowlist egress → accountable; sealed-at-rest +
 * deny-all → sealed; otherwise open. Certification of that claim is the `tier`.
 */
export function deriveProofTier(boundary: BoundarySpec): ProofTier {
  if (boundary.egress.policy === "allowlist") return "accountable";
  if (boundary.sealedVolumes.length > 0 && boundary.egress.policy === "deny-all") return "sealed";
  return "open";
}

/** Attestations valid for THIS measurement only — guarded never carries across a rebuild. */
export function attestationsForMeasurement(all: Attestation[], measurement: Measurement): Attestation[] {
  return all.filter((a) => a.status === "valid" && a.measurement.value === measurement.value);
}

export interface TierInputs {
  reproducible: boolean;
  lintsPass: boolean;
  hasUsageSignal: boolean;
  validAttestations: number;
}

export function deriveTier(i: TierInputs): Tier {
  if (i.validAttestations >= 1) return "guarded";
  if (i.reproducible && i.lintsPass && i.hasUsageSignal) return "beta";
  return "raw"; // reproducible + manifest, self-attested
}
