import { z } from "zod";

// Shared primitives — the house Zod idiom (cf. darkbox/packages/shared/src/schemas.ts):
// regex-validated string primitives with messages, then `z.infer` the type.

/** The v1 measurement value: a dstack compose-hash — bare lowercase 64-hex, no `0x`. */
export const composeHashSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "compose-hash: 64 lowercase hex chars, no 0x prefix");

/**
 * A measurement carries a `kind` discriminator so the same field is forward-
 * compatible with hardware roots (MRTD/RTMR) later; v1 is always `compose-hash`.
 * This is the trust anchor the control plane allowlists via addComposeHash.
 */
export const measurementSchema = z
  .object({
    kind: z.enum(["compose-hash", "mrtd", "rtmr"]).default("compose-hash"),
    value: composeHashSchema,
  })
  .strict();
export type Measurement = z.infer<typeof measurementSchema>;

/** A reviewer's ed25519 public key, `ed25519:<base64url>` (the JWK `x`, no padding). */
export const ed25519PubKeySchema = z
  .string()
  .regex(/^ed25519:[A-Za-z0-9_-]+$/, "ed25519:<base64url> public key");

/** A detached signature over a measurement, lowercase hex. */
export const signatureSchema = z.string().regex(/^[a-f0-9]+$/, "lowercase hex signature");

/** A workload id == URL slug == specimen directory name. Never the common name. */
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, "slug: lowercase, digits, hyphens (the workload id)");

/** A pinned upstream ref: a tag (v16.3-cvm1) or a 40-hex commit. */
export const githubRefSchema = z.string().min(1, "a pinned tag or commit");

/** ISO-8601 timestamp. */
export const isoDateSchema = z.iso.datetime();

/**
 * An OCI image reference: name[:tag][@sha256:<64hex>]. A digest pin is preferred
 * (immutable); a bare tag is accepted but flagged by a boundary lint, because a tag
 * doesn't pin the bytes — a real registry has both kinds.
 */
export const imageRefSchema = z
  .string()
  .regex(/^[A-Za-z0-9._/-]+(?::[A-Za-z0-9._-]+)?(?:@sha256:[a-f0-9]{64})?$/, "OCI image reference");

/** Is this image reference pinned to an immutable digest? */
export const isDigestPinned = (ref: string): boolean => /@sha256:[a-f0-9]{64}$/.test(ref);
