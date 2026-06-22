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
| 🟡 Signed measurement log (append-only) | schema `logEntrySchema`; git substrate | — (signing in M2) |
| 🟡 First-party certification + signing → `guarded` | `reviewerSchema`, `attestationSchema`, tier join | — (ed25519 signing in M2) |
| 🟡 Deprecation / measurement-invalid path | freshness `cve` → static banner | `built-html` (banner) |
| 🟡 Gate 0 zero-trust isolation (CI) | designed (split-execution, hermetic, path-scoped auto-merge); `CODEOWNERS` | — (workflows in M2) |
| 🟡 Upstream watcher / freshness | `freshnessSchema`, `/integrations/:id/freshness` | — (watcher bot in M2) |
| ✅ Trust-policy *schema* published (eval is consumer-side) | `trustPolicySchema` | — |
| ⏳ Federated reviewers, bonding, leak/audit bounty, on-chain registry, observatory report | — | — (deferred, gated on third-party demand) |
