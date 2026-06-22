import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readBuilds, readReviewers, writeJson, dir } from "./io.ts";
import { signHex } from "./crypto.ts";
import { attestationSchema, type Attestation } from "./schema/build.ts";

export interface AttestOptions {
  keyPath?: string;
  now?: string;
  scope?: string;
}

// Gate 2 — a registered reviewer signs an attestation OVER the build's measurement.
// Authorization is cryptographic ("is this a registered key?"), not session-based.
// The private key is read from a keyfile / TERRARIUM_REVIEWER_KEY; it never lives
// in the repo. The signature binds to the exact measurement, so guarded is
// per-measurement and is re-earned on every rebuild.
export function attest(id: string, reviewerId: string, opts: AttestOptions = {}): Attestation {
  const reviewer = readReviewers().find((r) => r.id === reviewerId);
  if (!reviewer) throw new Error(`unknown reviewer "${reviewerId}" — add reviewers/${reviewerId}.yaml`);
  if (reviewer.status !== "active") throw new Error(`reviewer "${reviewerId}" is ${reviewer.status}, not active`);

  const builds = readBuilds(id);
  const latest = builds.find((b) => b.isLatest) ?? builds[0];
  if (!latest) throw new Error(`no build for "${id}" — run gate0 first`);

  const keyPath = opts.keyPath ?? process.env.TERRARIUM_REVIEWER_KEY ?? join(dir.secrets, `${reviewerId}.key`);
  const privateKeyPem = readFileSync(keyPath, "utf8");
  const signature = signHex(privateKeyPem, latest.measurement.value);

  const att = attestationSchema.parse({
    buildRef: `${id}@${latest.version}`,
    measurement: latest.measurement,
    reviewerId,
    scope: opts.scope ?? "boundary-review",
    signature,
    issuedAt: opts.now ?? new Date().toISOString(),
    status: "valid",
  } satisfies Attestation);

  writeJson(join(dir.attestations, `${latest.measurement.value}-${reviewerId}.json`), att);
  return att;
}
