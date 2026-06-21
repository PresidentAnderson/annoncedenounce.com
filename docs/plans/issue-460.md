# Plan — Issue #460: Jurisdiction-aware deadline & reminder rule-packs (epic)

Status: PLAN (epic / human-gated). This document is the deliverable. Do NOT build the full
feature from this PR — the epic is gated on counsel sign-off (#417) and architecture review.

## Repo note (read first)

Issue #460 and all the code it touches live in the **`juge.ca`** repository
(`lib/litigation/*.ts`). This plan is authored from the `annoncedenounce.com` worktree
(the active autonomy worktree), so the implementation paths below are **`juge.ca`-relative**.
The first implementation slice must be opened as a PR against `juge.ca`, not against this
repo. This PR carries only the plan so the issue has a tracked artifact (Refs #460).

Files inspected to ground this plan (all in `juge.ca`):
- `lib/litigation/versioned-deadlines.ts` — pack-aware engine shape already exists
  (`DeadlineRule { edition, sourceCitation, reviewedBy, published, version }`,
  `computeRuleDeadline`, `resolveMatterDeadline`, `manualDeadlineNotice`).
- `lib/litigation/deadlines.ts` — the rich **QC-only** rule data (`DEADLINE_RULES`,
  art. 83 C.p.c. computation, I-16 holidays, `DeadlineSeverityInfo`). This is the QC
  "registry" the epic wants promoted into a pack.
- `lib/litigation/calendar.ts` — master calendar + ICS/CSV export and `parseICS`
  (ICS round-trip on the calendar already exists; reminder scheduling does not).
- `lib/litigation/administrative-deadlines.ts` — ombudsman/regulator windows derived
  from the resolution pathway; currently edition-agnostic, not pack-aware.

## Goal / scope

Turn QC-only deadline computation into reviewable, per-edition **rule packs** that feed a
real reminder scheduler, so "never miss a date" holds in every launched jurisdiction.

In scope:
- A versioned **pack** container format around `DeadlineRule` (the engine already accepts
  `edition`/`sourceCitation`/`reviewedBy`/`published`/`version`; the *data* and the
  *packaging/loading* layer are missing).
- A `qc` pack carrying the existing art. 83 registry, **byte-for-byte identical behavior**
  for QC (regression-locked by the existing `deadlines.test.ts` / `calendar.test.ts`).
- CI invariants: no deadline renders without a source; no edition computes a date without a
  reviewed + published rule.
- ICS round-trip for the court calendar (export exists; confirm/extend import path).
- A reminder scheduler over the master calendar with lead-time rules.
- Pack-awareness for administrative (ombudsman/regulator) windows.
- Bilingual, edition-aware reminder templates (reuse #431 infra; do not rebuild).

Explicitly out of scope (human-gated / other issues):
- Authoring the legal content of any non-QC pack — that is counsel work (#417, the [H] item).
- The durable reminder backend itself (#414); this epic supplies the *data layer* #414 needs.

## Two `DeadlineRule` types exist — resolve before any code

`versioned-deadlines.ts` and `deadlines.ts` each export a **different** `DeadlineRule`:
- `deadlines.ts`: rich QC registry entry (bilingual `label`, `kind`, `strict`,
  `peremptory`, `consequence`, `guideline`, `notes`, `authority`).
- `versioned-deadlines.ts`: thin versioned/pack entry (`edition`, `jurisdiction`,
  `triggerEvent`, `value`, `unit`, `sourceCitation`, `reviewedBy`, `published`, `version`).

The pack format must reconcile these (likely: pack entry = versioned envelope + the rich
QC fields it needs to render severity/consequence/source). Picking the merged shape is the
first architecture decision and blocks everything else.

## Sub-task checklist (A = automatable slice, H = human-gated)

- [ ] [A] Define the pack container type: `{ edition, sourceCitation, reviewedBy,
      published, version, rules: DeadlineRule[] }` and a pack registry/loader keyed by
      `edition`. Reconcile the two `DeadlineRule` shapes (see above).
- [ ] [A] Move the QC art. 83 `DEADLINE_RULES` into a `qc` pack (a `published: true`,
      `reviewedBy`-stamped pack). QC output must be unchanged — lock with existing tests.
- [ ] [A] Seed every other launched edition (e.g. `us`) as an **empty** pack →
      `resolveMatterDeadline` already returns the manual-only notice; assert that path.
- [ ] [A] CI invariant script (mirror `scripts/check-edition-purity.mjs` style): fail the
      build if any rule lacks a `sourceCitation`, or if any edition can compute a date from a
      rule that is not both `published` and `reviewedBy`. Wire into the existing checks.
- [ ] [A] Court-calendar ICS round-trip: `calendar.ts` already has `calendarToICS` +
      `parseICS`; add an explicit import/merge entry point and round-trip property tests.
- [ ] [A] Reminder scheduler over `buildCalendar` output: pure function that, given events
      + lead-time rules (e.g. T-30/T-7/T-1, earlier for peremptory deadlines), emits a
      deterministic list of reminder instances. No side effects in the lib (caller dispatches).
- [ ] [A] Make `administrative-deadlines.ts` pack-aware: ombudsman/regulator response and
      review windows per edition, sourced from a pack rather than hardcoded `waitDays`.
- [ ] [A] Bilingual edition-aware reminder templates (reference #431; reuse locale infra,
      run `npm run check:locales` in `juge.ca`).
- [ ] [H] Counsel authoring + sign-off of the first non-QC pack (one US state) as the
      reference review. Gated by #417.

## Human / architecture / counsel decisions required

1. **Pack `DeadlineRule` shape** (architecture): merge the two existing interfaces; decide
   what fields are mandatory in the CI invariant.
2. **Pack provenance / sign-off model** (architecture + counsel): what does `reviewedBy`
   record (name? bar id? attestation hash?) and where is the audit trail stored. Do NOT
   touch compliance attestations or gate flags while deciding this.
3. **First non-QC jurisdiction** (counsel): which US state is the reference pack, and the
   authoritative source for each rule (#417 review).
4. **Reminder lead-time policy** (product + counsel): default lead times, and stronger
   defaults for `peremptory: true` (fatal) deadlines where missing the date forfeits the right.
5. **Delivery channel for reminders** (architecture): this epic produces the *data* the
   durable backend (#414) consumes; confirm the contract with #414 before building #414's half.

## First safe slice (the only thing to build next, as a `juge.ca` PR)

Pure-data + invariant, zero behavior change, fully regression-locked:

1. In `juge.ca`, add a pack registry module (e.g. `lib/litigation/deadline-packs.ts`) that
   wraps the existing QC `DEADLINE_RULES` into a single `qc` pack and exposes
   `packForEdition(edition)` returning the QC pack for `qc` and an empty pack otherwise.
2. Route nothing new through it yet beyond what `resolveMatterDeadline` already does — keep
   QC computing real dates and all other editions on the existing manual-only notice.
3. Add the CI invariant: every rule in every published pack has a non-empty `sourceCitation`;
   no edition resolves a computed date from an unpublished/unreviewed rule. Wire it next to
   `scripts/check-edition-purity.mjs`.
4. Tests: assert QC output is byte-for-byte unchanged (reuse `deadlines.test.ts`),
   `us`/other editions return the manual notice, and the invariant script fails on a planted
   source-less rule.

This slice is safe because it adds a packaging layer and a guardrail without changing any
computed date or any gate/attestation. Everything beyond it (scheduler, ICS import merge,
non-QC content) waits on the decisions above and on counsel sign-off (#417).

Refs #460
