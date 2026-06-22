// Path-scoped auto-merge guard. A PR may auto-merge on green checks ONLY if it is
// purely additive under a single new specimens/<id>/ — no workflow/script/neighbour
// edits, no modifications or deletions. This runs in the untrusted PR context but
// only *reads* the diff. (Defense-in-depth with CODEOWNERS + branch protection.)

export interface Change {
  status: string; // git --name-status letter: A(dd) M(odify) D(elete) R(ename) ...
  path: string;
}

export type ScopeResult = { ok: true; id: string } | { ok: false; reason: string };

/**
 * @param existingIds specimen ids that already exist at the PR base. Auto-merge is
 *   only for a brand-NEW specimen, so adding files under an already-existing one
 *   (where a human already reviewed the boundary) must not auto-merge.
 */
export function checkScope(changes: Change[], existingIds: string[] = []): ScopeResult {
  if (changes.length === 0) return { ok: false, reason: "no changes" };
  const ids = new Set<string>();
  for (const c of changes) {
    if (c.status !== "A") {
      return { ok: false, reason: `non-additive change (${c.status}) to "${c.path}" — new-specimen PRs must only add files` };
    }
    const m = c.path.match(/^specimens\/([a-z0-9][a-z0-9-]*)\/.+/);
    if (!m) return { ok: false, reason: `path outside specimens/<id>/: "${c.path}"` };
    ids.add(m[1]);
  }
  if (ids.size !== 1) return { ok: false, reason: `touches ${ids.size} specimen dirs; exactly one new id required` };
  const id = [...ids][0];
  if (existingIds.includes(id)) {
    return { ok: false, reason: `specimen "${id}" already exists — auto-merge is for purely-additive NEW specimens only` };
  }
  return { ok: true, id };
}

/** Parse `git diff --name-status <base>...HEAD` output into changes. */
export function parseNameStatus(diff: string): Change[] {
  return diff
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("\t");
      return { status: parts[0][0], path: parts[parts.length - 1] };
    });
}
