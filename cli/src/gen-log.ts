import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  listSpecimenIds,
  readBuilds,
  readAttestations,
  writeJson,
  writeJsonl,
  readJsonl,
  stableStringify,
  dir,
} from "./io.ts";
import { signHex, verifyHex, chainHash, publicKeyFromPrivate } from "./crypto.ts";
import { logEntrySchema, type LogEntry } from "./schema/catalog.ts";
import type { Build } from "./schema/build.ts";

const GENESIS = "0".repeat(64);

// The append-only signed measurement log. The canonical substrate is the open
// repo's git history; log/measurements.jsonl is a deterministic, hash-chained,
// signed *materialisation* of it (for the /measurements API + tamper-evidence).
// In v1 the registry log signer is the first-party operator; its public key is
// published at log/registry-key.json so anyone can verify the chain.

type LogCore = Omit<LogEntry, "entryHash" | "signature">;

function events(): LogCore[] {
  const buildByMeasurement = new Map<string, Build>();
  const cores: Omit<LogCore, "seq" | "prevHash">[] = [];

  for (const id of listSpecimenIds()) {
    for (const b of readBuilds(id)) {
      buildByMeasurement.set(b.measurement.value, b);
      cores.push({
        event: "measured",
        measurement: b.measurement,
        integrationId: id,
        source: { repo: b.source.repo, ref: b.source.ref, recipe: b.source.recipe, commit: b.sourceCommit },
        signers: [],
        revocations: [],
        rebuilders: b.rebuilders,
        timeline: [{ at: b.builtAt, event: "measured" }],
      });
    }
  }
  for (const a of readAttestations()) {
    const b = buildByMeasurement.get(a.measurement.value);
    if (!b) continue;
    cores.push({
      event: a.status === "revoked" ? "revoked" : "attested",
      measurement: a.measurement,
      integrationId: b.integrationId,
      source: { repo: b.source.repo, ref: b.source.ref, recipe: b.source.recipe, commit: b.sourceCommit },
      signers: [a.reviewerId],
      revocations: [],
      rebuilders: b.rebuilders,
      timeline: [{ at: a.issuedAt, event: a.status === "revoked" ? "revoked" : "attested" }],
    });
  }

  // deterministic order: time (from the single timeline entry), measured-before-attested, then measurement
  cores.sort((x, y) => {
    const ax = x.timeline[0].at;
    const ay = y.timeline[0].at;
    if (ax !== ay) return ax.localeCompare(ay);
    if (x.event !== y.event) return x.event === "measured" ? -1 : 1;
    return x.measurement.value.localeCompare(y.measurement.value);
  });

  return cores.map((c, i) => ({ seq: i, prevHash: GENESIS, ...c }));
}

export function genLog(opts: { keyPath?: string } = {}): LogEntry[] {
  const keyPath = opts.keyPath ?? process.env.TERRARIUM_LOG_KEY ?? join(dir.secrets, "registry.key");
  const privateKeyPem = readFileSync(keyPath, "utf8");

  const entries: LogEntry[] = [];
  let prevHash = GENESIS;
  for (const core of events()) {
    const linked: LogCore = { ...core, prevHash };
    const entryHash = chainHash(prevHash, stableStringify(linked));
    const signature = signHex(privateKeyPem, entryHash);
    entries.push(logEntrySchema.parse({ ...linked, entryHash, signature }));
    prevHash = entryHash;
  }

  writeJsonl(join(dir.log, "measurements.jsonl"), entries);
  writeJson(join(dir.log, "HEAD.json"), { count: entries.length, head: prevHash });
  writeJson(join(dir.log, "registry-key.json"), { signingKey: publicKeyFromPrivate(privateKeyPem) });
  return entries;
}

/** Verify the materialised log: the hash-chain is intact and every entry is signed by the registry key. */
export function verifyLog(): { ok: boolean; checked: number; reason?: string } {
  const entries = readJsonl(join(dir.log, "measurements.jsonl")).map((e) => logEntrySchema.parse(e));
  let registryKey: string;
  try {
    registryKey = (readJsonValue(join(dir.log, "registry-key.json")) as { signingKey: string }).signingKey;
  } catch {
    return { ok: false, checked: 0, reason: "missing registry-key.json" };
  }
  let prevHash = GENESIS;
  for (const e of entries) {
    const { entryHash, signature, ...core } = e;
    if (core.prevHash !== prevHash) return { ok: false, checked: entries.length, reason: `broken chain at seq ${e.seq}` };
    if (chainHash(prevHash, stableStringify(core)) !== entryHash) return { ok: false, checked: entries.length, reason: `bad entryHash at seq ${e.seq}` };
    if (!verifyHex(registryKey, entryHash, signature)) return { ok: false, checked: entries.length, reason: `bad signature at seq ${e.seq}` };
    prevHash = entryHash;
  }
  return { ok: true, checked: entries.length };
}

function readJsonValue(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}
