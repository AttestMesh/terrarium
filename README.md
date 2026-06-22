# Terrarium

Open-source registry of guarded, reproducible, confidential CVM integrations — **intake → certify → list**.

Each integration is a **specimen** in a naturalist's field guide: an open-source workload (Postgres, Redis, Qdrant, vLLM, an agent runtime, …) packaged so it draws the confidential boundary correctly — sealed storage, RA-TLS-only ingress, pinned/forced egress — and ships a **reproducible build whose measurement anyone can independently verify**. Listing is permissionless (anything that reproduces to a published measurement lists as `raw`); the value is the **certification layer** on top (`beta` → automated lints; `guarded` → an accredited reviewer signs the measurement).

Terrarium does **not** deploy or host CVMs — it stops at a read-only catalog API. The control plane + dstack/Phala consume that catalog to deploy. See the spec: `studio/docs/specs/cvm-integrations-marketplace.md`.

## How it works

```
specimens/<id>/  ──►  Gate 0 (reproduce → measurement)  ──►  builds/<id>/<version>.json
  specimen.yaml        Gate 1 (schema + boundary + honesty lints)        │
  boundary.yaml        Gate 2 (reviewer signs measurement → guarded)     ▼
  field-guide.md   ──►  build-index (join) ──► gen-api ──► static site + read-API
  docker-compose.yml                                       /catalog/:id → {imageRef,
                                                            measurement, boundarySpec,
                                                            attestations[], tier, …}
```

**The measurement is the trust anchor** — a [dstack-compatible compose-hash](cli/src/compose-hash.ts) (bare 64-hex), the exact value the control plane allowlists via `addComposeHash` at deploy.

**Authored vs derived is structural.** A contributor PR may only touch `specimens/<id>/` and authors just `commonName`, the plate, `description`, `fieldNote`, and the egress *policy*. Everything claim-bearing — measurement, tier, markings, freshness, the SEO title/slug — is filled by the pipeline and lives only in generated `builds/*.json`. Authored schemas are `.strict()`, so a smuggled `measurement:`/`tier:` is a hard validation failure.

## Develop

```bash
npm install
npm run validate specimens/postgres   # Gate 1: schema + boundary + honesty lints
npm run terrarium gate0 postgres       # Gate 0: reproduce → measurement → builds/
npm run gen                            # build-index + gen-api (→ index/ + public/ read-API)
npm run dev                            # Astro dev server (http://localhost:4321)
npm run build                          # gen + static build (→ dist/)
npm test                               # Vitest: compose-hash vector, schema, lints, converge, contract
npm run e2e                            # Playwright: rendered SEO + two-register assertions
npm run typecheck                      # astro check + tsc --noEmit
```

## Layout

| Path | Authored? | What |
|---|---|---|
| `specimens/<id>/` | ✍️ authored (PR scope) | `specimen.yaml`, `boundary.yaml`, `field-guide.md`, recipe, optional plate |
| `reviewers/` | ✍️ privileged (CODEOWNERS) | accredited signing keys (first-party in v1) |
| `builds/`, `attestations/`, `log/` | 🤖 generated, committed | measurements, signatures, the append-only signed log |
| `index/`, `public/catalog*` | 🤖 generated, gitignored | the join + static read-API (regenerated from committed data) |
| `cli/src/` | — | the `terrarium` CLI (schemas, measurement, lints, derive, index/api) |
| `src/` | — | the Astro site (SEO-first static pages + Svelte islands) |

## Status

v1 walking skeleton: Postgres specimen flows end-to-end (Gate 0 → index → SEO page → resolve contract). Deferred to later phases: federated reviewers, bonding/slashing, leak/audit bounty, on-chain registry, the observatory report. See `docs/traceability.md`.
