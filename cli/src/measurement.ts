import { parse as parseYaml } from "yaml";
import { getComposeHash, type AppCompose } from "./compose-hash.ts";
import type { Measurement } from "./schema/primitives.ts";

// v1 measurement = a dstack-compatible compose-hash over a canonical Terrarium
// AppCompose. We embed the recipe text verbatim as `docker_compose_file` (the same
// bytes dstack hashes), so any independent rebuilder over the committed, digest-
// pinned recipe converges on the same value — and it matches what addComposeHash
// allowlists at deploy.
export function buildAppCompose(id: string, recipeText: string): AppCompose {
  return {
    manifest_version: 2,
    name: id,
    runner: "docker-compose",
    docker_compose_file: recipeText,
  };
}

export function measure(id: string, recipeText: string): Measurement {
  return { kind: "compose-hash", value: getComposeHash(buildAppCompose(id, recipeText)) };
}

// Infra sidecars that share a compose but aren't the workload itself.
const INFRA_SERVICE = /fabric|sidecar|proxy|monitor|gateway|dns|wireguard|warden|envoy/i;

/** The workload image a consumer resolves — the first non-infra service's image. */
export function primaryImageRef(recipeText: string): string {
  const compose = parseYaml(recipeText) as { services?: Record<string, { image?: string }> };
  const services = compose.services ?? {};
  const named = Object.keys(services).filter((n) => services[n]?.image);
  const pick = named.find((n) => !INFRA_SERVICE.test(n)) ?? named[0];
  if (pick) return services[pick]!.image!;
  throw new Error("recipe has no service image to resolve as imageRef");
}
