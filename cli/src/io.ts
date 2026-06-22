import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { specimenSchema, boundarySpecSchema, fieldGuideSchema, type Specimen, type BoundarySpec, type FieldGuide } from "./schema/specimen.ts";
import { reviewerSchema, type Reviewer } from "./schema/reviewer.ts";
import { buildSchema, attestationSchema, advisorySchema, type Build, type Attestation, type Advisory } from "./schema/build.ts";
import { wantedRequestSchema, type WantedRequest } from "./schema/observatory.ts";

// The single I/O boundary. The repo root is the cwd (CLI is always run from there).
export const ROOT = process.cwd();
export const dir = {
  specimens: join(ROOT, "specimens"),
  reviewers: join(ROOT, "reviewers"),
  builds: join(ROOT, "builds"),
  attestations: join(ROOT, "attestations"),
  log: join(ROOT, "log"),
  secrets: join(ROOT, ".secrets"),
  data: join(ROOT, "data"),
  snapshots: join(ROOT, "snapshots"),
  index: join(ROOT, "index"),
  publicApi: join(ROOT, "public"),
};

/** Deterministic JSON: recursively key-sorted, stable array order, trailing newline. */
function sortValue(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortValue);
  if (v && typeof v === "object" && (v as object).constructor === Object) {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) o[k] = sortValue((v as Record<string, unknown>)[k]);
    return o;
  }
  return v;
}
export function stableStringify(value: unknown, indent = 2): string {
  return JSON.stringify(sortValue(value), null, indent) + "\n";
}

export function writeJson(path: string, value: unknown): void {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, stableStringify(value), "utf8");
}
export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function writeText(path: string, body: string): void {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, body, "utf8");
}

/** Append-only-friendly JSON Lines: one canonical (key-sorted) object per line. */
export function writeJsonl(path: string, items: unknown[]): void {
  mkdirSync(resolve(path, ".."), { recursive: true });
  const body = items.map((it) => JSON.stringify(sortValue(it))).join("\n") + "\n";
  writeFileSync(path, body, "utf8");
}
export function readJsonl(path: string): unknown[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));
}

/** Parse `---`-fenced YAML front-matter from a markdown file; returns its data + body. */
function parseFrontMatter(text: string): { data: unknown; body: string } {
  if (!text.startsWith("---")) return { data: {}, body: text };
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { data: {}, body: text };
  const fm = text.slice(text.indexOf("\n") + 1, end);
  const body = text.slice(end + 4).replace(/^\s*\n/, "");
  return { data: parseYaml(fm), body };
}

export interface SpecimenBundle {
  id: string;
  specimen: Specimen;
  boundary: BoundarySpec;
  fieldGuide: FieldGuide;
  recipeText: string;
  recipePath: string;
}

export function listSpecimenIds(): string[] {
  if (!existsSync(dir.specimens)) return [];
  return readdirSync(dir.specimens, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export function readSpecimen(id: string): SpecimenBundle {
  const base = join(dir.specimens, id);
  const specimen = specimenSchema.parse(parseYaml(readFileSync(join(base, "specimen.yaml"), "utf8")));
  if (specimen.id !== id) throw new Error(`specimen.id "${specimen.id}" must equal directory "${id}"`);
  const boundary = boundarySpecSchema.parse(parseYaml(readFileSync(join(base, "boundary.yaml"), "utf8")));
  const fg = parseFrontMatter(readFileSync(join(base, "field-guide.md"), "utf8"));
  const fieldGuide = fieldGuideSchema.parse(fg.data);
  const recipePath = resolve(base, specimen.build.recipe);
  const recipeText = readFileSync(recipePath, "utf8");
  return { id, specimen, boundary, fieldGuide, recipeText, recipePath };
}

export function writeBuild(b: Build): void {
  const v = buildSchema.parse(b); // assert our own output
  writeJson(join(dir.builds, v.integrationId, `${v.version}.json`), v);
  writeJson(join(dir.builds, v.integrationId, "latest.json"), { version: v.version });
}

export function readBuilds(id: string): Build[] {
  const base = join(dir.builds, id);
  if (!existsSync(base)) return [];
  return readdirSync(base)
    .filter((f) => f.endsWith(".json") && f !== "latest.json")
    .map((f) => buildSchema.parse(readJson(join(base, f))));
}

export function readReviewers(): Reviewer[] {
  if (!existsSync(dir.reviewers)) return [];
  return readdirSync(dir.reviewers)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .map((f) => reviewerSchema.parse(parseYaml(readFileSync(join(dir.reviewers, f), "utf8"))));
}

export function readAttestations(): Attestation[] {
  if (!existsSync(dir.attestations)) return [];
  return readdirSync(dir.attestations)
    .filter((f) => f.endsWith(".json"))
    .map((f) => attestationSchema.parse(readJson(join(dir.attestations, f))));
}

export interface UpstreamEntry {
  repo: string;
  pinnedRef: string;
  latestRelease: string | null;
  behind: boolean;
}

/** advisories.yaml — published upstream CVEs against specific measurements (maintained). */
export function readAdvisories(): Advisory[] {
  const path = join(ROOT, "advisories.yaml");
  if (!existsSync(path)) return [];
  const raw = parseYaml(readFileSync(path, "utf8"));
  return Array.isArray(raw) ? raw.map((a) => advisorySchema.parse(a)) : [];
}

/** data/upstream.json — the watcher's latest snapshot (id → upstream release state). */
export function readUpstreamState(): Record<string, UpstreamEntry> {
  const path = join(dir.data, "upstream.json");
  if (!existsSync(path)) return {};
  return readJson(path) as Record<string, UpstreamEntry>;
}

/** wanted.yaml — the WNPP-style demand ledger (request → intent → in-progress → listed). */
export function readWanted(): WantedRequest[] {
  const path = join(ROOT, "wanted.yaml");
  if (!existsSync(path)) return [];
  const raw = parseYaml(readFileSync(path, "utf8"));
  return Array.isArray(raw) ? raw.map((w) => wantedRequestSchema.parse(w)) : [];
}

export function cleanGenerated(): void {
  for (const p of [dir.index, join(dir.publicApi, "catalog"), join(dir.publicApi, "integrations")]) {
    if (existsSync(p)) rmSync(p, { recursive: true, force: true });
  }
}
