import { describe, it, expect } from "vitest";
import { generateKeypair, signHex } from "./crypto.ts";
import { verifiedAttestations, attestationLogEvent } from "./trust.ts";
import type { Reviewer } from "./schema/reviewer.ts";
import type { Attestation } from "./schema/build.ts";
import type { Measurement } from "./schema/primitives.ts";

const M = "e".repeat(64);
const measurement: Measurement = { kind: "compose-hash", value: M };
const kp = generateKeypair();

const reviewer = (over: Partial<Reviewer> = {}): Reviewer => ({
  id: "terrarium",
  name: "Terrarium",
  kind: "first-party",
  signingKey: kp.publicKey,
  accreditedAt: "2026-06-22T00:00:00Z",
  status: "active",
  ...over,
});
const att = (over: Partial<Attestation> = {}): Attestation => ({
  buildRef: "x@v1",
  measurement,
  reviewerId: "terrarium",
  scope: "boundary-review",
  signature: signHex(kp.privateKeyPem, M), // a real signature over the target measurement
  issuedAt: "2026-06-22T00:00:00Z",
  status: "valid",
  ...over,
});

describe("verifiedAttestations — a file is not a trusted fact", () => {
  it("accepts a valid signature by an active reviewer over the target measurement", () => {
    expect(verifiedAttestations([att()], [reviewer()], measurement)).toHaveLength(1);
  });
  it("rejects an UNKNOWN reviewer", () => {
    expect(verifiedAttestations([att({ reviewerId: "ghost" })], [reviewer()], measurement)).toHaveLength(0);
  });
  it("rejects a SUSPENDED reviewer", () => {
    expect(verifiedAttestations([att()], [reviewer({ status: "suspended" })], measurement)).toHaveLength(0);
  });
  it("rejects a REVOKED attestation", () => {
    expect(verifiedAttestations([att({ status: "revoked" })], [reviewer()], measurement)).toHaveLength(0);
  });
  it("rejects a BAD signature (signed a different value)", () => {
    const bad = att({ signature: signHex(kp.privateKeyPem, "f".repeat(64)) });
    expect(verifiedAttestations([bad], [reviewer()], measurement)).toHaveLength(0);
  });
  it("rejects a forged signature by a NON-registered key claiming a registered id", () => {
    const other = generateKeypair();
    expect(verifiedAttestations([att({ signature: signHex(other.privateKeyPem, M) })], [reviewer()], measurement)).toHaveLength(0);
  });
  it("an attestation over a DIFFERENT measurement does not count for this one (guarded never carries)", () => {
    const other: Measurement = { kind: "compose-hash", value: "a".repeat(64) };
    const a = att({ measurement: other, signature: signHex(kp.privateKeyPem, other.value) });
    expect(verifiedAttestations([a], [reviewer()], measurement)).toHaveLength(0);
  });
});

describe("attestationLogEvent — only authentic signatures create log history", () => {
  it("active + valid → attested", () => expect(attestationLogEvent(att(), [reviewer()])).toBe("attested"));
  it("authentic + revoked → revoked (a genuine revocation of a real signature)", () =>
    expect(attestationLogEvent(att({ status: "revoked" }), [reviewer()])).toBe("revoked"));
  it("bad signature → null (no fabricated history)", () => {
    const other = generateKeypair();
    expect(attestationLogEvent(att({ signature: signHex(other.privateKeyPem, M) }), [reviewer()])).toBeNull();
  });
  it("unknown reviewer → null", () => expect(attestationLogEvent(att({ reviewerId: "ghost" }), [reviewer()])).toBeNull());
  it("suspended reviewer (even a 'valid' file) → null", () =>
    expect(attestationLogEvent(att(), [reviewer({ status: "suspended" })])).toBeNull());
});
