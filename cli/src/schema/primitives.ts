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

/** A reviewer's ed25519 public key, `ed25519:<base64>`. */
export const ed25519PubKeySchema = z
  .string()
  .regex(/^ed25519:[A-Za-z0-9+/=]+$/, "ed25519:<base64> public key");

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

/** An OCI image reference resolved to a digest: name@sha256:<64hex>. */
export const imageRefSchema = z
  .string()
  .regex(/@sha256:[a-f0-9]{64}$/, "OCI ref pinned to a digest (name@sha256:...)");
