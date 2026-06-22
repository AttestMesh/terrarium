#!/usr/bin/env -S npx tsx
import { readSpecimen, listSpecimenIds } from "./io.ts";
import { honestyLint } from "./lint/honesty.ts";
import { boundaryLint } from "./lint/boundary.ts";
import { gate0 } from "./gate0.ts";
import { buildIndex } from "./build-index.ts";
import { genApi } from "./gen-api.ts";

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

const [cmd, arg] = process.argv.slice(2);
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
    console.error("usage: terrarium <validate|gate0|build-index|gen-api> [id]");
    process.exit(2);
}
