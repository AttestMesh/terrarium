import { z } from "zod";
import {
  slugSchema,
  githubRefSchema,
  isoDateSchema,
  imageRefSchema,
  measurementSchema,
  signatureSchema,
} from "./primitives.ts";
import { categorySchema, boundarySpecSchema, fieldGuideSchema } from "./specimen.ts";
import { tierSchema, proofTierSchema, freshnessSchema, buildSchema, attestationSchema } from "./build.ts";

/** Publisher identity = the GitHub PR author. `verified` is a label, not a login state. */
export const publisherSchema = z
  .object({
    githubId: z.string().min(1),
    name: z.string().min(1),
    kind: z.enum(["first-party", "community", "third-party"]),
    verified: z.boolean(),
  })
  .strict();
export type Publisher = z.infer<typeof publisherSchema>;

/** SEO strings — derived. Generic workload first, brand in the tail; slug == id. */
export const seoSchema = z
  .object({
    slug: slugSchema,
    title: z.string().min(1),
    h1: z.string().min(1),
    metaDescription: z.string().min(1),
  })
  .strict();
export type Seo = z.infer<typeof seoSchema>;

/** Field-guide lore PROJECTIONS — derived from the verified record for the site only. */
export const loreSchema = z
  .object({
    habitat: z.string(), // substrate, e.g. "Intel TDX · dstack"
    diet: z.array(z.string()), // ingress ports/protocols + RA-TLS surfaces
    markings: z.string(), // measurement + reproducibility, rendered
    predators: z.array(z.string()), // category threat model + boundary spec
  })
  .strict();
export type Lore = z.infer<typeof loreSchema>;

/** Integration — the specimen joined to its latest build, denormalized for index + site. */
export const integrationSchema = z
  .object({
    id: slugSchema,
    commonName: z.string(),
    category: categorySchema,
    role: z.string(),
    publisher: publisherSchema,
    tier: tierSchema,
    proofTier: proofTierSchema,
    freshness: freshnessSchema,
    costHint: z.string().optional(),
    latestBuild: buildSchema,
    attestations: z.array(attestationSchema),
    fieldGuide: fieldGuideSchema,
    lore: loreSchema,
    seo: seoSchema,
    plate: z.string().nullable(),
    range: z.number().int().nullable(), // network telemetry — null in v1, NEVER authored
  })
  .strict();
export type Integration = z.infer<typeof integrationSchema>;

/**
 * EXACT consumer contract: GET /catalog/:id. The control plane reads this at
 * deploy time, allowlists `measurement`, evaluates `attestations` against its
 * own trust policy, and passes `imageRef` to dstack. The field set must not drift
 * — a golden test pins it.
 */
export const catalogResolveSchema = z
  .object({
    imageRef: imageRefSchema,
    measurement: measurementSchema,
    boundarySpec: boundarySpecSchema,
    attestations: z.array(attestationSchema),
    tier: tierSchema,
    proofTier: proofTierSchema,
    freshness: freshnessSchema,
    publisher: publisherSchema,
  })
  .strict();
export type CatalogResolve = z.infer<typeof catalogResolveSchema>;

/**
 * Trust-policy SCHEMA — published by Terrarium; the *evaluation* runs consumer-side
 * (the control plane at deploy), never here. (spec: consumer-relative trust policy.)
 */
export const trustPolicySchema = z
  .object({
    trustedReviewers: z.array(z.string()),
    minSignatures: z.number().int().min(1),
    requireFirstParty: z.boolean().optional(),
  })
  .strict();
export type TrustPolicy = z.infer<typeof trustPolicySchema>;

/** A signed, hash-chained entry in the append-only measurement log (git substrate). */
export const logEntrySchema = z
  .object({
    seq: z.number().int().min(0),
    prevHash: z.string(),
    entryHash: z.string(),
    event: z.enum(["measured", "attested", "revoked"]),
    measurement: measurementSchema,
    integrationId: slugSchema,
    source: z
      .object({ repo: z.string(), ref: githubRefSchema, recipe: z.string(), commit: z.string() })
      .strict(),
    signers: z.array(z.string()).default([]),
    revocations: z
      .array(z.object({ reviewerId: z.string(), at: isoDateSchema, reason: z.string() }).strict())
      .default([]),
    rebuilders: z.number().int().min(0),
    timeline: z.array(z.object({ at: isoDateSchema, event: z.string() }).strict()).default([]),
    signature: signatureSchema,
  })
  .strict();
export type LogEntry = z.infer<typeof logEntrySchema>;
