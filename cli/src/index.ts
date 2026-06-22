#!/usr/bin/env -S npx tsx
import { writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { readSpecimen, listSpecimenIds, dir } from "./io.ts";
import { honestyLint } from "./lint/honesty.ts";
import { boundaryLint } from "./lint/boundary.ts";
import { gate0 } from "./gate0.ts";
import { measure } from "./measurement.ts";
import { checkScope, parseNameStatus } from "./scope-check.ts";
import { attest } from "./attest.ts";
import { genLog, verifyLog } from "./gen-log.ts";
import { buildIndex } from "./build-index.ts";
import { genApi } from "./gen-api.ts";
import { generateKeypair, publicKeyFromPrivate } from "./crypto.ts";

/** Gate 1 — schema (via readSpecimen) + honesty + boundary lints. Exit 1 on any finding. */
function validate(target?: string): void {
  const ids = target ? [target.replace(/^specimens\//, "").replace(/\/$/, "")] : listSpecimenIds();
  let findings = 0;
  for (const id of ids) {
    const { specimen, boundary, fieldGuide } = readSpecimen(id);
    const f = [...honestyLint(fieldGuide, boundary), ...boundaryLint(specimen, boundary)];
    if (f.length === 0) {
      console.log(`✓ ${id}: schema + lints pass`);
    } else {
      findings += f.length;
      for (const x of f) console.error(`✗ ${id}: [${x.rule}] ${x.field} — ${x.message}`);
    }
  }
  if (findings > 0) process.exit(1);
}

/** Generate an ed25519 keypair; private key → .secrets/<name>.key (gitignored), public key printed. */
function keygen(name: string): void {
  const { publicKey, privateKeyPem } = generateKeypair();
  mkdirSync(dir.secrets, { recursive: true });
  const keyPath = join(dir.secrets, `${name}.key`);
  writeFileSync(keyPath, privateKeyPem, "utf8");
  chmodSync(keyPath, 0o600);
  console.log(`keygen ${name}: private key → ${keyPath} (gitignored)`);
  console.log(`  signingKey: ${publicKey}`);
  console.log(`  (verify: ${publicKey === publicKeyFromPrivate(privateKeyPem) ? "ok" : "MISMATCH"})`);
}

const [cmd, arg, arg2] = process.argv.slice(2);
switch (cmd) {
  case "validate":
    validate(arg);
    break;
  case "gate0": {
    if (!arg) throw new Error("usage: terrarium gate0 <id>");
    const b = gate0(arg);
    console.log(`gate0 ${arg}: ${b.measurement.value} (${b.rebuilders} rebuilders) → builds/${arg}/${b.version}.json`);
    break;
  }
  case "measure": {
    // compute-only (no write) — each CI rebuilder prints its value; converge compares
    if (!arg) throw new Error("usage: terrarium measure <id>");
    process.stdout.write(measure(arg, readSpecimen(arg).recipeText).value + "\n");
    break;
  }
  case "scope-check": {
    // path-scoped auto-merge guard against the PR base; exit 1 if not a purely-additive new specimen
    const base = arg === "--base" ? arg2 : arg;
    if (!base) throw new Error("usage: terrarium scope-check <baseSha>");
    const diff = execSync(`git diff --name-status ${base}...HEAD`, { encoding: "utf8" });
    const r = checkScope(parseNameStatus(diff));
    if (r.ok) console.log(`scope-check: ok — purely-additive new specimen "${r.id}"`);
    else {
      console.error(`scope-check: ${r.reason}`);
      process.exit(1);
    }
    break;
  }
  case "keygen":
    if (!arg) throw new Error("usage: terrarium keygen <name>");
    keygen(arg);
    break;
  case "attest": {
    if (!arg || !arg2) throw new Error("usage: terrarium attest <id> <reviewerId>");
    const a = attest(arg, arg2);
    console.log(`attest ${arg} by ${arg2}: signed ${a.measurement.value} → attestations/`);
    break;
  }
  case "gen-log": {
    const entries = genLog();
    console.log(`gen-log: ${entries.length} signed entr${entries.length === 1 ? "y" : "ies"} → log/measurements.jsonl`);
    break;
  }
  case "verify-log": {
    const r = verifyLog();
    console.log(`verify-log: ${r.ok ? `ok (${r.checked} entries)` : `FAILED — ${r.reason}`}`);
    if (!r.ok) process.exit(1);
    break;
  }
  case "build-index": {
    const n = buildIndex().length;
    console.log(`build-index: ${n} integration(s) → index/`);
    break;
  }
  case "gen-api": {
    const n = genApi().length;
    console.log(`gen-api: ${n} integration(s) → public/ read-API`);
    break;
  }
  default:
    console.error(
      "usage: terrarium <validate|gate0|measure|scope-check|keygen|attest|gen-log|verify-log|build-index|gen-api> [args]",
    );
    process.exit(2);
}
