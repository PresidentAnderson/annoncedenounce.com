# Plan — Issue #424: EFSP payload→envelope mapping + document validation (child of #412)

> **Mode:** PLAN. This document is the deliverable. Do **not** attempt a full
> build from this PR. The implementation lands in the **juge.ca** application
> repo (`PresidentAnderson/juge.ca`), not here — this plan is tracked in the
> `annoncedenounce.com` repo because that is where this worktree runs.
> Refs #424.

## Why this lives in two repos

Issue #424 targets the electronic-filing (EFSP) pipeline. The source files it
concerns live **only** in juge.ca:

- `lib/filing/efsp.ts` — `FilingEnvelope`, `EfspAdapter`, `MockEfspAdapter`,
  `FilingSubmission`, `FilingStatusEvent`, `applyFilingStatusEvent`.
- `lib/filing/webhook.ts` — inbound status-event parsing + HMAC verification.
- `lib/litigation/filing-readiness/filing-package.ts` — `assembleFilingPackage`
  (the frozen, human-readable matter snapshot: draftIds, exhibitIds, manifest).
- `lib/litigation/filing-readiness/readiness-checker.ts` — `assessFilingReadiness`
  (per-court red/amber/green checklist + `packagingReady` roll-up).
- `lib/litigation/filing-readiness/court-catalog.ts` — `requirementsFor`,
  `RequiredDocument`, `exhibitRules` (`maxExhibits`, `batesRequired`).
- `lib/store/cases.ts` — `LegalCase`, `Draft`, exhibits, documents.

This repo (`annoncedenounce.com`) is the static launch site; it has no `lib/`
application code. The plan is authored against the juge.ca source verified on
2026-06-21 so the remaining slices are concrete rather than speculative.

## Goal (from the issue title)

Give the filing pipeline **one sanctioned, validated path** from a juge.ca matter
snapshot to a provider `FilingEnvelope`:

1. **Payload→envelope mapping** — a pure function that turns a `FilingPackage`
   (+ its source `LegalCase` and target court) into a `FilingEnvelope`, instead
   of callers hand-building the loosely-typed `FilingEnvelope` literal.
2. **Document validation** — refuse to build/submit an envelope whose documents
   do not actually exist on the matter, are not filing-eligible, or violate the
   target court's profile (missing required slots, exhibit count over
   `maxExhibits`, Bates required but absent, empty/blank required envelope
   fields).

Cross-cutting invariant (matches the rest of the platform): **organizational
help, not legal advice, and never fabricate.** Validation must *block* an unsafe
filing with an honest bilingual reason; it must never silently "fix up" a payload
or invent a document id, a court, or a service requirement.

## Current state (verified in juge.ca on 2026-06-21)

| Capability | File | Status |
| --- | --- | --- |
| `FilingEnvelope` shape (`matterId`, `title`, `court`, `documentIds[]`, `serviceRequired?`) | `lib/filing/efsp.ts` L3-9 | **Exists** — but assembled ad hoc by callers |
| `EfspAdapter.buildEnvelope` / `submit` / `status` | `lib/filing/efsp.ts` L26-31 | **Exists (interface)** |
| `MockEfspAdapter.buildEnvelope` validation | `lib/filing/efsp.ts` L36-39 | **Minimal** — only throws when `documentIds.length === 0`; does **not** verify ids exist, are eligible, or satisfy the court |
| `assembleFilingPackage` (frozen snapshot: draftIds, exhibitIds, manifest; ids filtered to those on the matter, de-duped, order preserved) | `lib/litigation/filing-readiness/filing-package.ts` | **Exists** — produces the snapshot but has **no bridge** into `FilingEnvelope` |
| `assessFilingReadiness` (per-court checklist; `allMetRequired`, `packagingReady`, `maxExhibits`, `batesRequired`) | `lib/litigation/filing-readiness/readiness-checker.ts` | **Exists** — the readiness signal the validator should reuse, not duplicate |
| Inbound webhook parse + HMAC verify | `lib/filing/webhook.ts` | **Exists** — outbound mapping/validation is the gap, not inbound |
| Mapping `FilingPackage` (or `LegalCase`) → `FilingEnvelope` | — | **MISSING** (core of #424) |
| Pre-build/pre-submit document validation | — | **MISSING** (core of #424) |
| Tests for mapping + validation | — | **MISSING** |

**The gap:** there is no single function that maps a matter snapshot to a
provider envelope, and no validation gate before `buildEnvelope`/`submit`. Today a
caller could construct a `FilingEnvelope` with stale or ineligible document ids,
or one that breaches the court's exhibit/Bates rules, and the mock adapter would
accept it.

## Proposed shape (juge.ca)

Add a small, pure, dependency-light module — proposed
`lib/filing/envelope-mapping.ts`:

```ts
export interface EnvelopeValidationIssue {
  code:
    | "no-documents"
    | "unknown-document"        // id not on the matter
    | "not-filing-eligible"     // draft type is "not-a-filing" per evaluateFiling
    | "required-slot-unmet"     // a required readiness check is unmet
    | "exhibit-limit-exceeded"  // exhibits > court.exhibitRules.maxExhibits
    | "bates-required"          // court requires Bates, none present
    | "empty-field";            // matterId/title/court blank
  message: Bi;                  // bilingual { en, fr }
  documentId?: string;
}

export type EnvelopeResult =
  | { ok: true; envelope: FilingEnvelope }
  | { ok: false; issues: EnvelopeValidationIssue[] };

/** Pure, deterministic. No I/O, no Date.now in the mapping itself. */
export function mapPackageToEnvelope(
  c: LegalCase,
  pkg: FilingPackage,
  serviceRequired?: boolean,
): EnvelopeResult;
```

Mapping rules (all deterministic, all reuse existing helpers — do not duplicate
court logic):

- `matterId` ← `c.id`; `title` ← `pkg`/matter title; `court` ← bilingual court
  name already computed in `assembleFilingPackage` (extract the naming to a
  shared helper so the manifest and the envelope cannot drift).
- `documentIds` ← `pkg.draftIds ++ pkg.exhibitIds`, but every id re-checked
  against the live matter (the package may be older than the matter) and against
  `evaluateFiling(...).channel !== "not-a-filing"` for drafts.
- Court rules ← reuse `assessFilingReadiness(c, pkg.courtType, pkg.jurisdiction)`:
  if `!allMetRequired`, emit `required-slot-unmet` per failing required check;
  enforce `exhibitRules.maxExhibits` and `batesRequired` from the same source.
- Empty/blank `matterId`/`title`/`court` ⇒ `empty-field`.
- Then have `MockEfspAdapter.buildEnvelope` (and the real adapter, when added)
  call the validator and **throw/return the issues** instead of its current
  bare length check — so validation lives in one place and every adapter inherits
  it.

Why a `Result` rather than throwing in the mapper: the workspace UI needs to show
the litigant *which* documents/slots blocked the filing; an exception loses that.
Adapters can still translate `{ ok: false }` into a thrown error at the I/O edge.

## Sub-task checklist

- [ ] Extract the bilingual court-name formatting from `assembleFilingPackage`
      into a shared helper so manifest and envelope use one source.
- [ ] Add `lib/filing/envelope-mapping.ts` with `mapPackageToEnvelope` +
      `EnvelopeValidationIssue` + `EnvelopeResult` (pure, deterministic).
- [ ] Validation: unknown-document, not-filing-eligible, required-slot-unmet,
      exhibit-limit-exceeded, bates-required, empty-field — all bilingual,
      all sourced from `assessFilingReadiness` / `evaluateFiling`, none duplicated.
- [ ] Route `MockEfspAdapter.buildEnvelope` (and any future adapter) through the
      validator so the gate is adapter-agnostic.
- [ ] (UI, optional follow-up) Surface blocking issues in the filing component
      that calls the adapter (`components/workspace/ClerkFilings.tsx` /
      `FilingReadiness.tsx`) with the existing readiness empty-state tone.
- [ ] Tests: happy path (qc package maps 1:1); stale/unknown id dropped→blocked;
      ineligible draft rejected; over-`maxExhibits` blocked; Bates-required-absent
      blocked; empty title/court blocked; determinism (same inputs ⇒ same result).
- [ ] `node_modules/.bin/tsc --noEmit` clean for touched files; `npm test`;
      `npm run check:locales` for the new bilingual strings.

## Decisions required before/around build

- **[architecture]** Confirm `mapPackageToEnvelope` is the **only** sanctioned
  way to build a `FilingEnvelope`, and that `MockEfspAdapter.buildEnvelope` must
  delegate to it. Optionally add a lint/guard so future code cannot hand-roll a
  `FilingEnvelope` literal that bypasses validation.
- **[architecture]** `Result` object vs. thrown error at the mapper boundary
  (this plan recommends `Result` for the mapper, throw at the adapter edge).
- **[product/counsel]** Exact bilingual wording for each blocking issue (EN + FR),
  consistent with the "not legal advice / verify the registry's rules" notice
  already in the manifest. No envelope-block copy ships without sign-off, since it
  tells a litigant a filing is *not* ready.
- **[counsel]** Confirm that blocking on `required-slot-unmet` (vs. warning) is the
  safe posture — i.e. the tool should refuse to assemble a provider envelope it
  believes is incomplete rather than submit and let the court reject.
- **[product]** Whether `serviceRequired` is derived from the court profile or
  always an explicit caller/user input (today it is an optional free field on
  `FilingEnvelope`).

## First safe slice (smallest correct next PR, in juge.ca)

**Add `mapPackageToEnvelope` as a pure mapper with validation, plus its unit
tests — without yet rewiring the adapter or the UI.**

Rationale: it is purely additive (a new file + new tests), depends only on
already-shipped, already-tested helpers (`assembleFilingPackage`,
`assessFilingReadiness`, `evaluateFiling`, `requirementsFor`), changes no
existing behaviour, and keeps the QC path byte-for-byte identical. It gives the
team a proven, reviewable mapping+validation unit to land first; rewiring
`MockEfspAdapter.buildEnvelope` to delegate to it, and surfacing issues in the
UI, then follow as separate small PRs once the bilingual copy is signed off.

Steps:
1. Extract the court-name helper from `assembleFilingPackage`.
2. Add `lib/filing/envelope-mapping.ts` with `mapPackageToEnvelope` returning
   `EnvelopeResult`, reusing `assessFilingReadiness` for all court rules.
3. Add `lib/filing/__tests__/envelope-mapping.test.ts` covering the cases above.
4. Run `tsc --noEmit` (no new errors in touched files), `npm test`,
   `npm run check:locales`.

Defer adapter rewiring, UI surfacing, and the real (non-mock) EFSP adapter to
follow-up PRs; the `required-slot-unmet` blocking copy must not merge until
counsel approves the wording.

## Out of scope

- The real (non-mock) provider EFSP adapter and its network/auth code (separate
  child of #412).
- Inbound webhook handling — already shipped in `lib/filing/webhook.ts`.
- Any change to `lib/version.ts`, monetization/compliance gate flags,
  attestations, or migrations.
- Any change in this `annoncedenounce.com` repo beyond this plan document.
