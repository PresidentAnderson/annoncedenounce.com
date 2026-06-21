# Plan — Issue #383: Order creation + milestone state-pipeline tracking

> Status: BLOCKED in this repository. This document is the deliverable, shipped
> as a PR so the issue has traceability (Refs #383). See "Repository mismatch"
> below for why no code change lands in `annoncedenounce.com`.

## Repository mismatch (why this is a plan, not an implementation)

Issue #383 ("Order creation + milestone state-pipeline tracking") is an issue in
the **`PresidentAnderson/juge.ca`** repository, not in
**`PresidentAnderson/annoncedenounce.com`** where this worktree lives.

Evidence:

- `gh issue view 383` in this repo (`annoncedenounce.com`) returns
  *"Could not resolve to an issue or pull request with the number of 383."* The
  only issue here is #1 ("Install sovereign-autonomy-pack").
- `gh issue view 383 --repo PresidentAnderson/juge.ca` resolves the exact issue:
  title "Order creation + milestone state-pipeline tracking", milestone
  "Phase 1 — Public beta", labels `area:marketplace`, `area:workspaces`,
  "Part of #378".
- Every artifact the issue names lives in `juge.ca`, not here:
  - `components/workspace/LitigationOps.tsx`
  - `/marketplace/orders`
  - service `milestones` pipelines (`lib/litigation/ops-catalog.ts`)
  - `lib/marketplace/engage.ts`, `components/marketplace/ServiceFunnel.tsx`

`annoncedenounce.com` is a **static HTML/CSS landing site** (`index.html`,
`privacy.html`, `assets/`, `scripts/`, `api/version.js`). It has no React, no
TypeScript app code, no `components/`, no `lib/marketplace/`, no `tsc` build, and
no marketplace/workspace concepts. Implementing this feature here would create
dead, unshippable code and violate the rule "touch only files relevant to this
issue." The correct surface is `juge.ca`.

**Required human decision:** re-target / re-dispatch issue #383 to the `juge.ca`
repository's autonomy loop (or run the agent against `juge.ca`). No further work
on this issue should land in `annoncedenounce.com`.

## Scope (when executed in `juge.ca`)

Placing an order from a service page must create a *persisted, case-linked order*
whose status advances through that service's `milestones` pipeline, visible to
the user, in `/marketplace/orders`, and in the case workspace
(`LitigationOps.tsx`). Reuse the existing live flows (bailiff
service-of-documents, expert request) — do not fork a parallel pipeline.

### Acceptance criteria (from the issue)

- [ ] Order creation from a service page produces a persisted order tied to a case.
- [ ] Order state renders the service's `milestones` (en/fr) as a progress pipeline.
- [ ] Existing live flows (bailiff service-of-documents, expert request) are reused, not duplicated.
- [ ] Order appears in `/marketplace/orders` and the case workspace.
- [ ] State transitions are driven by the same source of truth as today's flows.

## Existing infrastructure to reuse (do NOT reinvent)

Confirmed present in `juge.ca`:

- `lib/marketplace/engage.ts` — `engageFromMatter(matter, req)` already turns an
  in-matter `ServiceRequest` into a real linked marketplace order via `postOrder`,
  carrying `matterId` + `sharedDocumentIds`. `serviceRequestToOrderInput()` and
  `serviceKindToOrderType()` are the pure mappers. This is the source of truth
  for order creation; the service-page flow must funnel through it.
- `lib/litigation/ops-catalog.ts` — `OpsService.milestones: { en: string[]; fr: string[] }`
  per service kind (signification/saisie/expulsion/constat/expert/...), plus
  `US_OPS_OVERRIDES`. This is the canonical milestone list to render as a pipeline.
- `components/workspace/LitigationOps.tsx` — workspace surface where the order +
  its milestone progress must appear.
- `components/marketplace/ServiceFunnel.tsx` — the service-page funnel entry point.
- `lib/marketplace/board.ts` — `postOrder`, `OrderStatus`, `OrderType`,
  `PostOrderInput` (the order persistence + status enum / source of truth).
- `lib/store/cases.ts` — `LegalCase`, `ServiceRequest`, `ServiceMilestone`,
  `ServiceStatus` (the matter ↔ service link; `ServiceRequest.orderId` ties them).

## Concrete sub-task checklist (in `juge.ca`)

1. **Map order status → milestone index.** Derive a single helper (next to
   `engage.ts`) `orderStatusToMilestoneIndex(orderType/serviceKind, status)`
   that maps the `OrderStatus` enum onto the service's `milestones[lang]` array,
   so one source of truth drives the pipeline. Add a pure unit test mirroring
   `lib/marketplace/__tests__/engage.test.ts`.
2. **Service-page order creation.** In `ServiceFunnel.tsx`, route "place order"
   through `engageFromMatter` (existing bailiff/expert path) rather than any new
   write path; ensure the created order's `id` is stored back on the
   `ServiceRequest.orderId`, linking order ↔ case.
3. **Milestone pipeline component.** Add a presentational `OrderMilestones`
   (en/fr aware) that takes `milestones[lang]` + the current milestone index and
   renders the progress pipeline. Reuse existing styling/tokens from
   `LitigationOps.tsx`; no new design system.
4. **Workspace surface.** Render `OrderMilestones` for each linked order inside
   `LitigationOps.tsx`, keyed off `ServiceRequest.orderId` + its service kind.
5. **Orders list surface.** Ensure the order shows in `/marketplace/orders` with
   its current milestone label (reuse the list's existing row component).
6. **i18n.** Milestone strings come from the existing `ops-catalog` en/fr arrays;
   any new chrome strings go in `dictionaries/en.ts` + `fr`. Run
   `npm run check:locales`.
7. **Verify.** `node_modules/.bin/tsc --noEmit` adds no new errors in touched
   files; run the marketplace/litigation unit tests.

## Human / architecture / counsel decisions required

- **Repo re-targeting (blocking):** confirm #383 is dispatched against `juge.ca`,
  not `annoncedenounce.com`. Without this the work cannot land correctly.
- **Status → milestone mapping:** product/architecture sign-off on which
  `OrderStatus` values correspond to which milestone steps per service kind
  (the catalog lists milestone *labels*, not a status mapping). This is the one
  genuinely ambiguous design choice.
- **Sibling dependency #378:** routing + component land as siblings; sequence so
  #383 builds on #378's funnel rather than racing it.
- **Compliance:** order ↔ matter linkage must preserve the existing subset/share
  walls (engage.ts notes RLS migration 0061 + the 0057 subset wall). Do not widen
  document scope. No monetization/compliance gate flags or attestations change.

## First safe slice

In `juge.ca`: land sub-task **1** alone — the pure, fully unit-tested
`orderStatusToMilestoneIndex` mapper next to `engage.ts`, with no UI or write-path
changes. It is side-effect-free, reviewable in isolation, establishes the single
source of truth the rest of the pipeline reads from, and unblocks the
status→milestone product decision with a concrete proposal to react to.

In `annoncedenounce.com`: no code slice — this repo is the wrong surface; this
plan doc is the only artifact that belongs here.
