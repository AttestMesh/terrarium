import { describe, it, expect } from "vitest";
import { generateKeypair, signHex, verifyHex, chainHash, publicKeyFromPrivate } from "./crypto.ts";

describe("ed25519 attestation crypto (node:crypto)", () => {
  const kp = generateKeypair();

  it("publishes a base64url key that derives from the private key", () => {
    expect(kp.publicKey).toMatch(/^ed25519:[A-Za-z0-9_-]+$/);
    expect(publicKeyFromPrivate(kp.privateKeyPem)).toBe(kp.publicKey);
  });

  it("sign/verify roundtrip over a measurement", () => {
    const m = "a".repeat(64);
    expect(verifyHex(kp.publicKey, m, signHex(kp.privateKeyPem, m))).toBe(true);
  });

  it("a signature over one measurement does not verify another (no replay)", () => {
    const sig = signHex(kp.privateKeyPem, "a".repeat(64));
    expect(verifyHex(kp.publicKey, "b".repeat(64), sig)).toBe(false);
  });

  it("a tampered signature is rejected", () => {
    const sig = signHex(kp.privateKeyPem, "a".repeat(64));
    const bad = sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");
    expect(verifyHex(kp.publicKey, "a".repeat(64), bad)).toBe(false);
  });

  it("a different key does not verify", () => {
    const other = generateKeypair();
    const sig = signHex(kp.privateKeyPem, "c".repeat(64));
    expect(verifyHex(other.publicKey, "c".repeat(64), sig)).toBe(false);
  });

  it("the hash chain is collision-sensitive (tamper-evident)", () => {
    const prev = "0".repeat(64);
    expect(chainHash(prev, '{"a":1}')).not.toBe(chainHash(prev, '{"a":2}'));
    expect(chainHash(prev, '{"a":1}')).toBe(chainHash(prev, '{"a":1}'));
  });
});
