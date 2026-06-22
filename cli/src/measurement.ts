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

/** The primary (first-service) image, pinned to its digest — the imageRef consumers resolve. */
export function primaryImageRef(recipeText: string): string {
  const compose = parseYaml(recipeText) as { services?: Record<string, { image?: string }> };
  const services = compose.services ?? {};
  for (const name of Object.keys(services)) {
    const image = services[name]?.image;
    if (image) return image;
  }
  throw new Error("recipe has no service image to resolve as imageRef");
}
