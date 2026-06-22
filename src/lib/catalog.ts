import { computeIntegrations } from "../../cli/src/build-index.ts";
import type { Integration } from "../../cli/src/schema/catalog.ts";

// The site reads the same read-only join the read-API serves — one source of truth,
// so a page and its /catalog/:id JSON can never disagree.
let cache: Integration[] | null = null;

export function allIntegrations(): Integration[] {
  return (cache ??= computeIntegrations());
}

export function getIntegration(id: string): Integration | undefined {
  return allIntegrations().find((i) => i.id === id);
}

export function byCategory(): Map<string, Integration[]> {
  const m = new Map<string, Integration[]>();
  for (const i of allIntegrations()) {
    const arr = m.get(i.category) ?? [];
    arr.push(i);
    m.set(i.category, arr);
  }
  return m;
}

export const CATEGORY_LABEL: Record<string, string> = {
  "sealed-datastore": "Sealed datastores",
  "confidential-compute": "Confidential compute",
  "controlled-egress-gateway": "Controlled-egress gateways",
  "agent-runtime": "Agent runtimes",
};

export const TIER_BLURB: Record<string, string> = {
  raw: "reproducible + manifest, self-attested — zero accredited signatures",
  beta: "automated boundary lints pass + a usage signal",
  guarded: "≥1 accredited-reviewer signature on the current measurement",
};
