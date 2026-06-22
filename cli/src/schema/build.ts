import { z } from "zod";
import {
  slugSchema,
  githubRefSchema,
  isoDateSchema,
  imageRefSchema,
  measurementSchema,
  signatureSchema,
} from "./primitives.ts";
import { boundarySpecSchema } from "./specimen.ts";

// DERIVED schemas — written by the pipeline into builds/<id>/<version>.json and
// attestations/<measurement>.json. Validated on write (CI asserts its own output)
// and on read (Astro content layer).

export const tierSchema = z.enum(["raw", "beta", "guarded"]);
export const proofTierSchema = z.enum(["sealed", "accountable", "open"]);
export const freshnessSchema = z.enum(["current", "behind", "cve"]);
export type Tier = z.infer<typeof tierSchema>;
export type ProofTier = z.infer<typeof proofTierSchema>;
export type Freshness = z.infer<typeof freshnessSchema>;

/**
 * An attestation is a reviewer signature OVER a measurement — never over an id.
 * This is what makes `guarded` per-measurement: a new build has a new measurement
 * and therefore zero attestations until re-signed (spec: guarded never carries).
 */
export const attestationSchema = z
  .object({
    buildRef: z.string().min(1), // "<id>@<version>" — provenance, not the trust key
    measurement: measurementSchema, // the exact value signed (the trust key)
    reviewerId: z.string().min(1),
    scope: z.string().min(1),
    signature: signatureSchema,
    issuedAt: isoDateSchema,
    status: z.enum(["valid", "revoked"]).default("valid"),
  })
  .strict();
export type Attestation = z.infer<typeof attestationSchema>;

/** Build — one per measured version. Everything here is derived by the pipeline. */
export const buildSchema = z
  .object({
    integrationId: slugSchema,
    version: z.string().min(1),
    sourceCommit: z.string().min(1),
    upstreamRef: githubRefSchema,
    measurement: measurementSchema,
    imageRef: imageRefSchema, // resolved OCI digest ref — part of the consumer contract
    source: z
      .object({ repo: z.string(), ref: githubRefSchema, recipe: z.string() })
      .strict(), // repo + pinned ref + recipe path — "rebuild it yourself"
    boundarySpec: boundarySpecSchema, // snapshot bound to this measurement
    reproducible: z.boolean(),
    rebuilders: z.number().int().min(0), // ≥2 converging => reproduced
    builtAt: isoDateSchema,
    isLatest: z.boolean(),
    freshness: freshnessSchema,
    supersedes: z.string().optional(),
  })
  .strict();
export type Build = z.infer<typeof buildSchema>;
