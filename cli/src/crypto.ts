import {
  generateKeyPairSync,
  createPublicKey,
  createPrivateKey,
  sign as nodeSign,
  verify as nodeVerify,
  createHash,
  type KeyObject,
} from "node:crypto";

// Ed25519 via Node's built-in crypto (no extra dependency). A reviewer's public
// key is published as `ed25519:<base64url>` (the raw 32-byte key, JWK `x`); the
// private key never enters the repo — it lives in a CI secret / a gitignored
// keyfile and is read only by the reviewer/registry jobs.

export interface Keypair {
  /** ed25519:<base64url> — goes in reviewers/<id>.yaml */
  publicKey: string;
  /** PKCS#8 PEM — stored only in .secrets/ (gitignored) or a CI secret */
  privateKeyPem: string;
}

export function generateKeypair(): Keypair {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const jwk = publicKey.export({ format: "jwk" }) as { x: string };
  return {
    publicKey: `ed25519:${jwk.x}`,
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }) as string,
  };
}

function publicKeyObject(signingKey: string): KeyObject {
  const x = signingKey.replace(/^ed25519:/, "");
  return createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x }, format: "jwk" });
}

/** Derive the published `ed25519:<base64url>` form from a PKCS#8 private key PEM. */
export function publicKeyFromPrivate(privateKeyPem: string): string {
  const jwk = createPublicKey(createPrivateKey(privateKeyPem)).export({ format: "jwk" }) as { x: string };
  return `ed25519:${jwk.x}`;
}

/** Sign a message (the measurement value, or a log entry hash) → lowercase hex. */
export function signHex(privateKeyPem: string, message: string): string {
  const key = createPrivateKey(privateKeyPem);
  return nodeSign(null, Buffer.from(message, "utf8"), key).toString("hex");
}

/** Verify a hex signature against a published `ed25519:<base64url>` key. */
export function verifyHex(signingKey: string, message: string, signatureHex: string): boolean {
  try {
    return nodeVerify(null, Buffer.from(message, "utf8"), publicKeyObject(signingKey), Buffer.from(signatureHex, "hex"));
  } catch {
    return false;
  }
}

/** sha256 hex over (prevHash ‖ canonical-entry) — the append-only log's tamper-evident chain. */
export function chainHash(prevHash: string, canonicalEntry: string): string {
  return createHash("sha256").update(prevHash + canonicalEntry, "utf8").digest("hex");
}
