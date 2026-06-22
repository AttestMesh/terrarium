# Traceability — spec requirement → implementation → tests

Maps the spec (`studio/docs/specs/cvm-integrations-marketplace.md`) to code. ✅ built · 🟡 partial (skeleton) · ⏳ deferred (federation layer).

| Requirement (spec) | Implementation | Tests |
|---|---|---|
| ✅ Reproducibility-gated listing (Gate 0) | `cli/src/gate0.ts`, `cli/src/measurement.ts`, `cli/src/compose-hash.ts` | `compose-hash.test.ts` (dstack known-answer vector), `converge.test.ts` |
| ✅ ≥2 independent rebuilders converge; not an oracle | `cli/src/converge.ts` | `converge.test.ts` (divergent/insufficient/mismatch all fail) |
| ✅ Boundary spec per integration (machine-checkable) | `cli/src/schema/specimen.ts` (`boundarySpecSchema`) | `schema.test.ts` |
| ✅ Tiered trust labels `raw`/`beta`/`guarded` | `cli/src/derive/facts.ts` (`deriveTier`) | `facts.test.ts` (tier ladder) |
| ✅ `guarded` never carries across a measurement | `attestationsForMeasurement` (join by measurement) | `facts.test.ts` (old measurement ≠ new build) |
| ✅ proofTier `sealed`/`accountable`/`open` (consumer vocab) | `deriveProofTier` | `facts.test.ts` (truth table) |
| ✅ Gate 1 boundary lints + honesty lint | `cli/src/lint/{boundary,honesty}.ts` | `honesty.test.ts` (the spec's worked example) |
| ✅ Authored vs derived enforced structurally | `.strict()` authored schemas + dir split | `schema.test.ts` (smuggled `measurement`/`tier` rejected) |
| ✅ Catalog API + index; resolve `id → {imageRef, measurement, boundarySpec, attestations[]}` | `cli/src/{build-index,gen-api}.ts`, `catalogResolveSchema` | `contract.test.ts`, `built-html.test.ts` |
| ✅ Identity & auth — open-repo model (no accounts) | GitHub PR = publisher; `reviewers/*.yaml` = keys; static site | — |
| ✅ Discoverable item pages (SEO) | `src/pages/specimens/[id].astro`, `BaseLayout.astro`, `sitemap.xml.ts`, `robots.txt.ts` | `e2e/specimen.spec.ts`, `built-html.test.ts` |
| ✅ Specimen entry schema (two registers) | `specimens/[id].astro` (field-guide ↔ inspector) | `e2e/specimen.spec.ts` |
| ✅ Logical categories as navigation | `categorySchema`, `categories/[category].astro` | — |
| ✅ Signed measurement log (append-only, hash-chained) | `cli/src/gen-log.ts` (materialised from git substrate), `/measurements/:hash` | `crypto.test.ts`; integration-verified tamper detection |
| ✅ First-party certification + signing → `guarded` | `cli/src/{crypto,attest}.ts`, `reviewers/flashbots.yaml`, tier join by measurement | `crypto.test.ts`, `facts.test.ts`, `built-html.test.ts` (guarded + signer) |
| ✅ Embeddable trust badge | `gen-api.ts` → `/badge/:id.svg` | `built-html` (served) |
| ✅ Deprecation / measurement-invalid path | `advisories.yaml` → `deriveFreshness` `cve` → static banner | `freshness.test.ts`, `built-html` |
| ✅ Gate 0 zero-trust isolation (CI) | `.github/workflows/pr-gates.yml` (pull_request, no secrets, ≥2-rebuilder matrix → converge), `scope-check`, `CODEOWNERS`, `docs/ci-and-branch-protection.md` | `scope-check.test.ts` |
| ✅ Upstream watcher / freshness / version history | `cli/src/watch.ts`, `cli/src/derive/freshness.ts`, Integration `versions[]`, `/integrations/:id/freshness` | `freshness.test.ts` |
| ✅ Trust-policy *schema* published (eval is consumer-side) | `trustPolicySchema` | — |
| ✅ Comparison view + topical-authority hubs (SEO) | `compare.astro`, `learn/[topic].astro`, `lib/explainers.ts` | built |
| ✅ Client-side filtering (URL-fragment only, no crawlable result URLs) | `CatalogFilter.svelte` over server-rendered cards | built |
| ✅ Wanted queue (demand ledger + search-miss capture) | `wanted.yaml`, `wantedRequestSchema`, `wanted.astro` | schema-validated |
| ✅ Catalog snapshots (observatory time-series, day-one) | `cli/src/snapshot.ts`, `snapshots/*.json`, `observatory.astro` | `snapshot.test.ts` |
| ✅ Embeddable badge | `gen-api.ts` → `/badge/:id.svg` | `built-html` |
| ⏳ Federated reviewers, bonding, leak/audit bounty, on-chain registry, observatory *report* layer | — | — (deferred, gated on third-party demand) |
