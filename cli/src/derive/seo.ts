import type { Specimen } from "../schema/specimen.ts";
import type { Seo } from "../schema/catalog.ts";

// SEO is load-bearing: the item page is the front door. Generic workload first,
// brand in the tail; slug == the workload id, never the cute common name.

const WORKLOAD_LABEL: Record<string, string> = {
  postgres: "PostgreSQL",
  redis: "Redis",
  qdrant: "Qdrant",
  sqlite: "SQLite",
  vllm: "vLLM",
};

const SUBSTRATE = "Intel TDX";

function humanizeWorkload(id: string): string {
  return WORKLOAD_LABEL[id] ?? id.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
}

export function workloadLabel(id: string): string {
  return humanizeWorkload(id);
}

export function deriveSeo(specimen: Specimen): Seo {
  const workload = humanizeWorkload(specimen.id);
  return {
    slug: specimen.id, // /specimens/postgres — never commonName
    title: `Confidential ${workload} on ${SUBSTRATE} — ${specimen.commonName} · Terrarium`,
    h1: `${specimen.commonName} — Confidential ${workload}`,
    metaDescription:
      `Confidential ${workload} on ${SUBSTRATE}: a reproducible, measured CVM integration with a ` +
      `certified confidential boundary. Verify the measurement, inspect the boundary, deploy guarded.`,
  };
}
