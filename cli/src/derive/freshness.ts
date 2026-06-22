import type { Freshness } from "../schema/build.ts";

// Freshness is a first-class status that changes as upstream moves, independent of a
// build — so it is re-derived at index time from the upstream-watcher snapshot + the
// advisories list, not baked into the build at gate0 time. Without it, guarded rots
// silently.

export interface Advisory {
  measurement: string;
  cve: string;
  severity?: "low" | "medium" | "high" | "critical";
}

function versionTuple(ref: string): [number, number, number] | null {
  const m = ref.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  return m ? [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)] : null;
}

/** Is the pinned ref strictly older than the latest known upstream release? */
export function isBehind(pinnedRef: string, latestRelease: string | undefined | null): boolean {
  if (!latestRelease) return false;
  const a = versionTuple(pinnedRef);
  const b = versionTuple(latestRelease);
  if (!a || !b) return pinnedRef !== latestRelease; // unparseable → behind iff different
  for (let i = 0; i < 3; i++) {
    if (b[i] > a[i]) return true;
    if (b[i] < a[i]) return false;
  }
  return false;
}

export interface FreshnessInputs {
  measurement: string;
  pinnedRef: string;
  latestRelease?: string | null;
  advisories: Advisory[];
}

export function deriveFreshness(i: FreshnessInputs): Freshness {
  // A known upstream CVE against this exact measurement wins — a static site must
  // never silently serve a build with a published advisory.
  if (i.advisories.some((a) => a.measurement === i.measurement)) return "cve";
  if (isBehind(i.pinnedRef, i.latestRelease)) return "behind";
  return "current";
}
