import { join } from "node:path";
import { listSpecimenIds, readSpecimen, writeJson, dir, type UpstreamEntry } from "./io.ts";
import { isBehind } from "./derive/freshness.ts";

// Upstream watcher (M11). Watches each integration's upstream *releases* (not every
// commit) and snapshots the latest tag → data/upstream.json, which build-index reads
// to derive freshness. A real run also opens a version-bump PR that re-enters Gate 0
// (a new release → new measurement → a new build at `raw`; guarded is re-earned).

function ghRepo(repoUrl: string): string {
  return repoUrl
    .replace(/^https?:\/\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "");
}

export async function watch(): Promise<Record<string, UpstreamEntry>> {
  const state: Record<string, UpstreamEntry> = {};
  for (const id of listSpecimenIds()) {
    const { specimen } = readSpecimen(id);
    const repo = ghRepo(specimen.upstream.repo);
    let latestRelease: string | null = null;
    try {
      const headers: Record<string, string> = { "User-Agent": "terrarium-watcher", Accept: "application/vnd.github+json" };
      if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
      const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers });
      if (res.ok) latestRelease = ((await res.json()) as { tag_name?: string }).tag_name ?? null;
    } catch {
      /* offline / repo not found → upstream unknown, treated as not-behind */
    }
    state[id] = { repo, pinnedRef: specimen.upstream.ref, latestRelease, behind: isBehind(specimen.upstream.ref, latestRelease) };
  }
  writeJson(join(dir.data, "upstream.json"), state);
  return state;
}
