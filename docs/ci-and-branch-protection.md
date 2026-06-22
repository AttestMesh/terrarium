# CI & branch protection

The zero-trust intake pipeline. The one rule everything follows: **untrusted code runs with zero secrets; its output is a claim to verify, not a fact to trust.**

## Workflows

| Workflow | Trigger | Secrets | Runs untrusted recipe? | Purpose |
|---|---|---|---|---|
| `pr-gates.yml` | `pull_request` (never `_target`) | **none**, `contents: read` | yes | scope-guard → Gate 1 lints → Gate 0 reproduce matrix → **converge** |
| `publish.yml` | `push: main` | Pages deploy only | no | build site + read-API, verify the signed log, deploy |
| `automerge.yml` | `workflow_run` (pr-gates done) | `GITHUB_TOKEN` | no | request auto-merge for an additive specimen PR |

There is **no signing key in CI** in v1: certification (`attest` + `gen-log`) is a maintainer action run locally with the reviewer/registry private key, then committed via a CODEOWNERS-gated PR. So the only credential anywhere in CI is the Pages deploy token — the untrusted job has nothing to steal.

## Required branch-protection settings on `main`

Set these in the repo (Settings → Branches → main), so the workflows above actually bind:

1. **Require status checks** → require **`converge`** (the single gate that proves ≥2 rebuilders agree). Optionally also `gate1-lint`.
2. **Require review from Code Owners** — `CODEOWNERS` already routes `.github/`, `cli/`, `src/`, `reviewers/`, `builds/`, `log/` to first-party maintainers. A PR touching any of these needs a human; only a purely-additive `specimens/<new-id>/` PR can auto-merge.
3. **Require linear history** + **dismiss stale approvals**.
4. **Restrict who can push** to maintainers (auto-merge still works via the bot).

## The three-layer auto-merge guard (defense in depth)

1. **`scope-check`** (in `pr-gates`) — programmatically asserts the PR only *adds* files under one new `specimens/<id>/`. Catches scope at workflow time.
2. **branch protection** — ties merge to the adversarial `converge` check.
3. **`CODEOWNERS`** — any escape from (1)/(2) into a sensitive path still requires a maintainer review.

A mixed PR (new specimen + a workflow edit) fails layer 1 before auto-merge is ever enabled.

## Hardening TODO before turning auto-merge on

- **Pin every `uses:` to a commit SHA** (the workflows currently use version tags for readability).
- For Dockerfile recipes, add a two-phase build to `reproduce`: a digest-prefetch phase (egress allowed, recorded to a lockfile) then `docker buildx build --network=none` (hermetic), and assert the built image digests ⊆ the lockfile.
- Add `step-security/harden-runner` in block mode to the `reproduce` job to constrain job-level egress to the registry.
- Cap submission rate (a per-author open-PR limit) and keep `timeout-minutes` + `concurrency` as set.
