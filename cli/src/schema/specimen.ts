import { z } from "zod";
import { slugSchema, githubRefSchema, composeHashSchema } from "./primitives.ts";

// AUTHORED schemas. Every schema here is `.strict()`: a contributor who pastes a
// derived fact (measurement, tier, range, ...) into an authored file gets a hard
// validation failure. Authored-vs-derived is enforced structurally — derived facts
// only ever exist in generated builds/*.json, which a PR is path-filtered from.

/** Logical categories — the catalog's primary navigation axis (spec: Logical categories). */
export const CATEGORIES = [
  "sealed-datastore",
  "confidential-compute",
  "controlled-egress-gateway",
  "agent-runtime",
] as const;
export const categorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof categorySchema>;

/** specimen.yaml — identity + technical pointers. `claimedMeasurement` is OPTIONAL and only cross-checked. */
export const specimenSchema = z
  .object({
    id: slugSchema,
    commonName: z.string().min(1).max(60), // free brand name; NOT the SEO handle
    category: categorySchema, // contributor proposes; pipeline re-derives and must agree
    role: z.string().min(1),
    upstream: z
      .object({ repo: z.string().min(1), ref: githubRefSchema })
      .strict(),
    build: z
      .object({
        recipe: z
          .string()
          .min(1)
          .refine((p) => !p.startsWith("/") && !p.split(/[\\/]/).includes(".."), {
            message: "recipe must be a relative path inside the specimen dir (no '..' or absolute path)",
          }), // path inside specimens/<id>/
        claimedMeasurement: composeHashSchema.optional(), // CI derives the real one; must match
        attestation: z.url().optional(), // optional contributor-CI cross-rebuilder
      })
      .strict(),
    ingress: z
      .array(
        z.object({ port: z.number().int().min(1).max(65535), protocol: z.enum(["ra-tls", "tcp", "http"]) }).strict(),
      )
      .default([]),
    flavorHint: z.string().optional(),
    plate: z.string().optional(), // optional; auto-generated from traits if absent
  })
  .strict();
export type Specimen = z.infer<typeof specimenSchema>;

/**
 * boundary.yaml — the machine-checkable boundary spec. The only "authored intent"
 * here is the egress policy/allowlist; the rest is structural and lint-checked.
 * Egress is enforced by the standardized monitor (the Warden), referenced by version.
 */
export const boundarySpecSchema = z
  .object({
    sealedVolumes: z.array(z.string()).default([]),
    raTlsSurfaces: z.array(z.number().int().min(1).max(65535)).default([]),
    egress: z
      .object({
        monitor: z.string().regex(/^warden@\d+$/, "references the measured monitor, e.g. warden@1"),
        policy: z.enum(["deny-all", "allowlist"]),
        allowlist: z
          .array(z.object({ host: z.string().min(1), pin: z.string().optional() }).strict())
          .default([]),
      })
      .strict()
      .refine((e) => (e.policy === "deny-all" ? e.allowlist.length === 0 : true), {
        message: "egress.policy=deny-all forbids a non-empty allowlist",
        path: ["allowlist"],
      }),
    secrets: z.record(z.string(), z.enum(["born-in-box"])).default({}),
    logRedaction: z.record(z.string(), z.string()).default({}),
  })
  .strict();
export type BoundarySpec = z.infer<typeof boundarySpecSchema>;

/** field-guide.md front-matter — the ONLY free text. Length-capped per the voice guide. */
export const fieldGuideSchema = z
  .object({
    description: z.string().min(1).max(400), // ≤ ~60 words
    fieldNote: z.string().min(1).max(160), // one line — the honesty-lint subject
  })
  .strict();
export type FieldGuide = z.infer<typeof fieldGuideSchema>;
