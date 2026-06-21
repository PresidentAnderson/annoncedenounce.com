# Plan — Issue #378 (epic): Per-service marketplace funnel pages (landing → provider → order → state)

> Status: PLAN (epic / human-gated) — no feature code lands from this PR.
> This document is the deliverable, shipped as a PR so the epic has traceability
> (Refs #378). Two reasons it stays a plan: (1) #378 is a human-gated **epic**,
> not a leaf task, and (2) **repository mismatch** — the issue and all its code
> live in `PresidentAnderson/juge.ca`, not in this `annoncedenounce.com` worktree.

## Repository mismatch (why this is a plan, not an implementation)

Issue #378 is an issue in the **`PresidentAnderson/juge.ca`** repository, not in
**`PresidentAnderson/annoncedenounce.com`** where this worktree lives.

Evidence:

- `gh issue view 378` in this repo (`annoncedenounce.com`) returns
  *"Could not resolve to an issue or pull request with the number of 378."* The
  only issue here is #1 ("Install sovereign-autonomy-pack").
- `gh issue view 378 --repo PresidentAnderson/juge.ca` resolves the exact epic:
  title "[epic] Per-service marketplace funnel pages (landing → provider → order
  → state)", milestone "Phase 1 — Public beta", labels `area:marketplace`,
  `enhancement`, `epic`, `priority:high`, `tier:2`.
- Every artifact the epic names lives in `juge.ca`, not here:
  - `app/[lang]/app/services/page.tsx` (the catalog grid)
  - `lib/litigation/ops-catalog.ts` (`OPS_SERVICES`, the 7-service source of truth)
  - `app/[lang]/marketplace/[slug]/page.tsx` (the dynamic marketplace route)
  - `components/marketplace/ServiceFunnel.tsx` (the shared funnel component)

`annoncedenounce.com` is a **static HTML/CSS landing site** (`index.html`,
`privacy.html`, `assets/`, `scripts/`, `api/version.js`). It has no React, no
TypeScript app code, no `app/[lang]/`, no `components/`, no `lib/marketplace/`,
no `tsc` build, and no marketplace/services concepts. Implementing this feature
here would create dead, unshippable code and violate "touch only files relevant
to this issue." The correct surface is `juge.ca`.

**Required human decision (blocking):** confirm the epic and all seven children
are dispatched against `juge.ca`, not `annoncedenounce.com`. Without this, no
child task can land correctly.

## Current state in `juge.ca` (verified, 2026-06-21)

The architecture is **already locked and largely landed** — this epic is in
flight, not greenfield. The plan below reflects what exists vs. what remains, so
no agent re-does settled work.

| Child | Surface in `juge.ca` | Status (observed) |
|---|---|---|
| #379 route collision | `app/[lang]/marketplace/[slug]/page.tsx` | **Resolved.** Single `[slug]` segment; reserved service-kind keywords resolve to the funnel FIRST, all other slugs to a provider profile. Guarded by `isServiceKind()` in `lib/marketplace/service-provider-map.ts`; invariant documented (a provider slug must never equal a `ServiceKind`). No two-sibling-dynamic-segment build error. |
| #380 shared funnel component | `components/marketplace/ServiceFunnel.tsx` | **Landed.** One `OPS_SERVICES`-driven component, no per-kind branching; renders the six funnel steps (header, pricing tiers, provider step, order/quote CTA, milestone pipeline, content slot). |
| #381 landing content + i18n | `components/marketplace/ServiceFunnelContent.tsx` | **Seam exists**, suppressed when no translated editorial for the request locale (e.g. `es`). Editorial/FAQ/compliance copy + en/fr (and edition-aware) fill-in remains. |
| #382 provider selection | `components/marketplace/ProviderSelectionStep.tsx`, `SERVICE_TO_PROVIDERS` in `lib/marketplace/service-provider-map.ts` | **Seam exists** (returns null for kinds with no directory provider type); filtering UI to be completed. |
| #383 order + milestone tracking | `lib/marketplace/engage.ts`, `components/workspace/LitigationOps.tsx`, `/marketplace/orders` | **In progress** — has its own open plan PR (#383 / branch `issue-383`). Order persistence + `OrderStatus → milestones[lang]` index mapping is the substantive remaining work. |
| #384 payments for quote-only | order/quote CTA + `lib/litigation/ops-checkout-gating.ts` (`evaluateOpsKindCheckout`, `isGatedOpsKind`) | **Deferred — gated.** CTA already branches checkout vs quote and the UI mirrors the `/api/ops/checkout` 423 predicate so it never exposes a CTA the API would refuse. Live payment for quote-only kinds ships Phase 3 GA behind the monetization gate (#59 / #60). **Do not flip any gate flag.** |
| #385 SEO / sitemap / links | `app/[lang]/app/services/page.tsx` (catalog deep-links to `marketplace/${kind}`), per-service `generateMetadata` in `[slug]/page.tsx` | **Mostly landed.** Catalog grid already links each card to its funnel; per-service metadata + hreflang alternates exist. Sitemap entries for the 7 funnel URLs remain. |
| #386 E2E tests | `tests/` (Playwright/E2E suite in `juge.ca`) | **Not started.** Funnel happy-path per kind + collision-invariant regression. |

## The 7 services (canonical, from `OPS_SERVICES` — confirmed all present)

| kind | name | pricing model |
|---|---|---|
| `commissioner` | Affidavit swearing | fixed ($59 / $99 / $149) |
| `bailiff` | Service of documents | fixed ($99 / $129 / $199), Stripe live |
| `translation` | Certified translation | quote-only |
| `expert` | Expert report | referral / quote |
| `lawyer` | Lawyer consultation | referral |
| `printing` | Printing & binding | fixed ($35 / $99 / $25) |
| `transcription` | Court transcription | quote-only |

`opsServices(currentEdition())` applies the active edition's labels/overrides
(e.g. the US edition via `US_OPS_OVERRIDES`); funnel + metadata are edition-aware.

## Epic scope (when executed in `juge.ca`)

Each of the 7 services gets a **full funnel** at `/[lang]/marketplace/<kind>`:

> landing → choose provider → order / quote / pay → track state pipeline

driven entirely by `OPS_SERVICES` (one component, no per-kind branching), using
each service's `milestones: { en; fr }` as the visible state pipeline. Reuse the
existing live order path (bailiff service-of-documents, expert request) — do not
fork a parallel pipeline.

### Acceptance criteria (epic-level)

- [ ] All 7 funnel URLs resolve with no route-collision build error (the `[slug]`
      reserved-keyword strategy holds; provider slugs never equal a `ServiceKind`).
- [ ] One shared `ServiceFunnel` renders all kinds from the catalogue.
- [ ] Each funnel exposes landing → provider → order/quote → milestone pipeline.
- [ ] Quote-only / referral kinds show a quote/referral CTA; fixed-price kinds
      show priced tiers; payment for quote-only stays behind the GA gate.
- [ ] Orders persist, link to the case/matter, and render their `milestones`
      progress in `/marketplace/orders` and the case workspace.
- [ ] Catalog grid links, per-service metadata, hreflang, and sitemap cover all 7.
- [ ] E2E covers the per-service happy path + the collision invariant.

## Concrete sub-task checklist (in `juge.ca`, in build order)

1. **#379 (done — verify only).** Add/keep a regression test asserting
   `isServiceKind(slug)` wins over provider lookup and that no provider directory
   slug equals a `ServiceKind` (the invariant in `service-provider-map.ts`).
2. **#380 (done — verify only).** Confirm `ServiceFunnel` stays catalogue-driven
   with zero per-kind branching as content/provider seams fill in.
3. **#381 — landing content + i18n.** Author editorial/how-it-works/FAQ/compliance
   copy in `ServiceFunnelContent.tsx` for all 7 kinds, en + fr (edition-aware);
   keep the `showEditorial` suppression for untranslated locales. Run
   `npm run check:locales`.
4. **#382 — provider selection.** Complete `ProviderSelectionStep` to filter
   marketplace profiles by `SERVICE_TO_PROVIDERS[kind]`; null for kinds with no
   directory provider type. Reuse `provider-directory-server` queries; respect
   provider-scope walls.
5. **#383 — order + milestone tracking (its own PR).** Route "place order"
   through `engageFromMatter` (existing bailiff/expert path); add a single pure
   `orderStatusToMilestoneIndex` mapper; render `milestones[lang]` as a pipeline
   in the funnel, `/marketplace/orders`, and `LitigationOps.tsx`. See the #383
   plan PR for detail.
6. **#385 — SEO / sitemap.** Add the 7 funnel URLs (per locale) to the sitemap;
   confirm catalog deep-links + per-service `generateMetadata`/hreflang.
7. **#384 — payments for quote-only (deferred, gated).** Only when #59 / #60 GA
   monetization gate opens. Keep the UI/API 423 mirror; **do not flip the gate.**
8. **#386 — E2E.** Per-kind funnel happy path (landing renders, provider step
   present/absent per kind, correct CTA lane, milestone pipeline) + the #379
   collision-invariant regression.

## Human / architecture / counsel decisions required

- **Repo re-targeting (blocking):** confirm #378 + all 7 children run against
  `juge.ca`, not `annoncedenounce.com`.
- **Status → milestone mapping (architecture/product):** the catalogue lists
  milestone *labels*, not a status mapping; product must sign off which
  `OrderStatus` values map to which milestone step per kind (the one genuinely
  ambiguous design choice; owned by #383).
- **Monetization gate (#384, counsel/finance):** live payment for quote-only
  kinds is GA-gated on #59 / #60. No agent flips the gate flag or alters the
  `/api/ops/checkout` 423 predicate without explicit human sign-off.
- **Compliance walls:** provider selection and order↔matter linkage must preserve
  existing provider-scope / document-subset / RLS walls (engage.ts notes the RLS
  + subset wall migrations). Do not widen document scope; no attestation changes.
- **Editorial/legal copy (#381):** per-service compliance/FAQ copy needs counsel
  review before publish, especially for regulated kinds (bailiff, commissioner,
  lawyer, expert).

## First safe slice

In `juge.ca`: **#379 + #380 verification** — add the collision-invariant
regression test (provider slug ≠ `ServiceKind`; service-kind slug resolves to the
funnel first) and a unit test asserting `ServiceFunnel` renders from
`OPS_SERVICES` with no per-kind branching. This is read-only relative to product
behaviour, locks the two settled foundations against regression as the remaining
seams (#381/#382/#383) fill in, and ships nothing user-visible — the safest
possible first move on an in-flight epic.
