import { verifyHex } from "./crypto.ts";
import type { Attestation } from "./schema/build.ts";
import type { Reviewer } from "./schema/reviewer.ts";
import type { Measurement } from "./schema/primitives.ts";

// The trust path. A file existing is NOT a trusted fact. An attestation only counts
// if it is a cryptographically authentic signature, by a REGISTERED reviewer, over
// the exact measurement — and, to affect tier or appear in the published catalog, the
// reviewer must be active and the attestation status valid. This is the single place
// that decides "is this attestation trustworthy", reused by the catalog and the log.

/** Authentic = the signature verifies against a registered reviewer's key, over the attestation's own measurement. */
export function attestationSignatureValid(att: Attestation, reviewers: Reviewer[]): boolean {
  const reviewer = reviewers.find((r) => r.id === att.reviewerId);
  if (!reviewer) return false; // unknown reviewer
  return verifyHex(reviewer.signingKey, att.measurement.value, att.signature);
}

/** Currently trustworthy = authentic AND reviewer.status active AND att.status valid. */
export function attestationActiveValid(att: Attestation, reviewers: Reviewer[]): boolean {
  const reviewer = reviewers.find((r) => r.id === att.reviewerId);
  if (!reviewer || reviewer.status !== "active") return false; // unknown or suspended/revoked reviewer
  if (att.status !== "valid") return false; // revoked attestation
  return verifyHex(reviewer.signingKey, att.measurement.value, att.signature);
}

/**
 * The verified, active-reviewer, valid attestations over the TARGET measurement —
 * the only ones that count toward tier or appear in the published catalog. Unknown,
 * suspended, revoked, bad-signature, and wrong-measurement attestations are dropped.
 */
export function verifiedAttestations(
  all: Attestation[],
  reviewers: Reviewer[],
  measurement: Measurement,
): Attestation[] {
  return all.filter((a) => a.measurement.value === measurement.value && attestationActiveValid(a, reviewers));
}

/**
 * Which transparency-log event (if any) an attestation file authentically supports:
 * - "attested": authentic + active reviewer + valid status
 * - "revoked":  authentic + status revoked (a genuine revocation of a real signature)
 * - null:       not authentic (forged / unknown reviewer / wrong measurement), or a
 *               suspended reviewer — no event, so a file alone can't fabricate history.
 */
export function attestationLogEvent(att: Attestation, reviewers: Reviewer[]): "attested" | "revoked" | null {
  if (!attestationSignatureValid(att, reviewers)) return null;
  if (att.status === "revoked") return "revoked";
  const reviewer = reviewers.find((r) => r.id === att.reviewerId)!; // exists: signature already verified
  return reviewer.status === "active" && att.status === "valid" ? "attested" : null;
}
