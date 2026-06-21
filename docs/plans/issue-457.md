# Plan — Issue #457: Jurisdiction-aware matter core

> **Mode:** PLAN (epic / human-gated). This document is the deliverable. Do **not**
> attempt a full build from this PR. The implementation lands in the **juge.ca**
> application repo (`PresidentAnderson/juge.ca`), not here — this plan is tracked
> in the `annoncedenounce.com` repo because that is where this worktree runs.
> Refs #457.

## Why this lives in two repos

Issue #457 is filed and worked in `PresidentAnderson/juge.ca` (labels
`epic`, `architecture`, `area:workspaces`, `priority:high`). The matter-core
source files it names (`lib/store/cases.ts`, `lib/litigation/*`,
`components/workspace/Intake.tsx`) exist **only** in juge.ca. This repo
(`annoncedenounce.com`) is the static launch site and has no `lib/store` or
`components/workspace`. The plan is therefore authored against the juge.ca code
that the autonomy loop has already partially shipped, so the remaining slices
are concrete and grounded rather than speculative.

## Goal (from the issue)

Put `jurisdiction` / `edition` / `locale` on every matter so the historically
QC-hardcoded deadline, template and content engines run correctly outside
Québec — without ever fabricating a legal date or recourse for an edition that
has no counsel-reviewed pack. Complements #417 (jurisdiction launch gates);
distinct because #457 threads jurisdiction *through the matter itself*.

Cross-cutting invariant for every slice: **edition purity — never fabricate**.
QC behaviour must stay byte-for-byte identical; any non-`qc` edition shows an
honest "manual / general info / launching soon" state instead of a
never-reviewed date or court list.

## Current state (verified in juge.ca on 2026-06-21)

The keystone data layer and several children have already shipped (issue comment
notes "first slice shipped — 7.27.7, commit 025641ca"). Verified directly in
the source:

| Child | File | Status |
| --- | --- | --- |
| `edition`/`jurisdiction`/`locale` on `LegalCase` + `migrateCase` backfill (default `qc`/`fr`, idempotent) + new matters stamp `currentEdition()` | `lib/store/cases.ts` (L1384-1401, L1523-1555, L1694-1701) | **Done** |
| Single deadline entry point `resolveMatterDeadline()` — computes for `qc`, returns `manualDeadlineNotice` (no fabricated date) for any other edition | `lib/litigation/versioned-deadlines.ts` | **Done (lib)** — not yet the *only* path callers use |
| Edition-scope helpers `pathwaysForEdition()` / `governmentBodiesForEdition()` (undefined edition treated as `qc`; non-qc returns `[]`) | `lib/litigation/resolution-pathways.ts` (L415), `lib/litigation/government-recourses.ts` (L949) | **Done (lib)** — not yet consumed by UI with an empty-state |
| `editionLegalPolicy().retentionRule` used for non-QC retention; QC keeps art. 2924 wording | `lib/litigation/archive.ts` (L219-238) | **Done** |
| Intake gates CourtType on edition (non-qc → honest "pending" notice + free-text jurisdiction, never TAL/TAQ); `emptyCase` stamps edition+locale | `components/workspace/Intake.tsx` (L44-58, L80-83, L242-301) | **Partly done** — court-type gate exists; explicit jurisdiction+locale *selection step before CourtType* still missing |
| Tests: matter-creates-with-edition, engine-returns-null/manual-for-unreviewed-edition, pathway-gated | `lib/store/__tests__/cases-edition.test.ts`, `lib/litigation/__tests__/resolution-pathways-edition.test.ts` | **Done** for shipped slices |
| `[H]` Counsel sign-off on legacy→QC default + per-edition "manual deadline" UPL wording | — | **Open** (human gate) |

## Remaining scope (the unshipped slices)

1. **Make `resolveMatterDeadline()` the single entry point.** Audit every caller
   that still reaches `computeRuleDeadline` / QC deadline logic directly and
   route it through `resolveMatterDeadline({ edition: case.edition, ... })`, so a
   non-QC matter renders the manual-deadline notice in the UI instead of nothing
   or a QC date. The lib already returns the right discriminated union; this is
   the wiring + render slice.
2. **Consume the edition-scope helpers in the resolution/recourse UI.** Replace
   direct reads of `PATHWAYS` / `GOVERNMENT_BODIES` in the workspace UI with
   `pathwaysForEdition(case.edition)` / `governmentBodiesForEdition(case.edition)`
   and render a "general info / launching soon" empty-state when the array is
   empty (non-qc). Mirror the deadline manual-only notice wording.
3. **Add an explicit jurisdiction + locale step to Intake before CourtType.**
   Today the edition resolves at build time and CourtType is gated, but the user
   does not pick jurisdiction/locale up front. Add a first wizard step that:
   captures locale (default = edition default) and sub-jurisdiction, then gates
   the CourtType step so a US matter never reaches the QC court list. Persist to
   the new `LegalCase` fields (already present).
4. **Verify `archive.ts` retention end to end** for a non-QC matter (no art. 2924
   leakage; `editionLegalPolicy().retentionRule` shown). Mostly a test slice
   since the code path exists.
5. **`[H]` Counsel sign-off** (blocking, see below).
6. **Tests for the new wiring:** intake-jurisdiction-step persists fields;
   deadline-UI-shows-manual-notice-for-non-qc; resolution-UI-shows-empty-state
   for non-qc; archive-retention-has-no-2924-for-non-qc.

## Decisions required before/around build

- **[H / counsel]** Sign-off that defaulting every legacy matter to `edition: qc`
  / `locale: fr` is correct, and approve the exact per-edition "manual deadline"
  and "general info / launching soon" UPL wording (EN + FR + each live edition
  locale). This is the hard gate — no non-QC date or recourse text ships without
  it.
- **[architecture]** Confirm `resolveMatterDeadline()` is the *only* sanctioned
  deadline entry point and add a lint/guard (extend `scripts/check-edition-purity.mjs`)
  so future callers cannot reintroduce a direct QC path.
- **[architecture]** Decide whether `jurisdiction` (sub-jurisdiction, e.g. US
  state) is free-text (current) or a per-edition enum; affects the Intake step
  and the court-type gate.
- **[product]** Empty-state copy + CTA for non-qc resolution pathways /
  government recourses ("launching soon" vs. "general info" link target).

## First safe slice (smallest correct next PR, in juge.ca)

**Slice 2 — consume the edition-scope helpers in the resolution/recourse UI.**
Rationale: the lib helpers and their tests already exist and are proven; this
slice is pure additive wiring + an empty-state, touches no deadline math, needs
no new counsel wording beyond the already-shipped manual notice pattern, and
keeps QC byte-for-byte identical (qc returns the full set in original order).

Steps:
1. Find the workspace component(s) that read `PATHWAYS` / `GOVERNMENT_BODIES`
   directly and swap to `pathwaysForEdition(case.edition)` /
   `governmentBodiesForEdition(case.edition)`.
2. Add a neutral "general info / launching soon" empty-state when the result is
   empty (non-qc), reusing the manual-only-notice tone.
3. Add a UI/integration test: qc renders the full list; a non-qc matter renders
   the empty-state and never a fabricated body.
4. Run `node_modules/.bin/tsc --noEmit` (no new errors in touched files),
   `npm test`, and `npm run check:locales` for any new strings.

Defer slices 1, 3 and the `[H]` counsel sign-off to follow-up PRs; slice 1 should
not merge until counsel approves the per-edition manual-deadline wording.

## Out of scope

`lib/version.ts`, any monetization/compliance gate flag or attestation, and any
non-additive migration. New deadline/recourse data for non-QC editions is out of
scope until counsel-reviewed (edition purity).
