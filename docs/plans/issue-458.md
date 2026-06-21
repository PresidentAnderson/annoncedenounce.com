# Plan — Issue #458: Stage-transition cascade (state machine with zero silent dead-ends)

> Status: **PLAN (epic / human-gated)** — this document is the deliverable. No feature is built here.
> Refs #458. Cross-links: feeds #414 (reminders); builds on `next-step.ts`.

## 0. Repository note (read first)

Issue #458 targets the **`juge.ca`** application (`lib/litigation/lifecycle.ts`,
`deadlines.ts`, `judgment.ts`, `next-step.ts`, `Lifecycle.tsx`, the `LegalCase`
model). This worktree is part of **`annoncedenounce.com`**, a static launch
site that names `juge.ca` as its reference-implementation source
(`docs/OPERATING_CANON.md`). The two repos are separate working copies and an
autonomy loop is active on the juge.ca checkout.

Therefore:

- The juge.ca source files are **out of scope** for any edit from this worktree.
- This is an **epic in PLAN mode** — even in the right repo the rule is "do NOT
  attempt a full build; write the plan."
- The actionable engineering described below is to be executed **inside the
  juge.ca repo** by a future implementation pass (one slice per PR), gated on
  the counsel/architecture decisions listed in §4.

## 1. Goal

Make the 47-step lifecycle in `lib/litigation/lifecycle.ts` **actively cascade**:
entering a stage *arms* the deadlines, services and next-steps that stage
requires, so the pipeline is unbroken **by construction** rather than merely
mapped. No lifecycle step may have its only forward edge hidden behind a
precondition that nothing in the system can ever satisfy ("silent dead-end").

The cascade must always **propose, never auto-commit** a legal deadline — a
human confirms every armed clock.

## 2. Scope

### In scope (target repo: juge.ca)

- A transition-trigger layer that reacts to stage entry and to lifecycle events
  (service-completed, judgment-entered) and *proposes* the downstream
  deadlines / services / next-steps.
- An append-only `lifecycleAudit[]` ledger on `LegalCase` (who / when / why a
  stage advanced).
- An extension of `next-step.ts` that exposes the *blocking preconditions* for
  the next step (a "what's blocking the next step" surface).
- A determinism test proving the graph has no unreachable forward edges.
- UI in `Lifecycle.tsx` rendering triggers as accept/confirm chips.

### Out of scope

- Any edit to `lib/version.ts`, monetization/compliance gate flags, or
  attestations.
- Auto-committing legal deadlines without human confirmation.
- The reminder delivery mechanism itself (owned by #414 — this epic only *feeds*
  it the armed clocks).
- Rewriting the 47-step graph content / legal correctness of individual steps
  (counsel-owned — see §4).

## 3. Sub-task checklist

Engineering children (`[A]`) — each should land as its own small PR in juge.ca:

- [ ] **3.1 Transition triggers (service-completed).** When a service is marked
  done, auto-*propose* the response/protocol deadlines in `deadlines.ts`
  (the 15-day clock + the relevant citation). Proposal only; never commits.
- [ ] **3.2 Transition triggers (judgment-entered).** When judgment is entered
  (`judgment.ts`), auto-*propose* the appeal deadline (art. 360) + the
  retraction window, and unlock the enforcement track.
- [ ] **3.3 Audit ledger.** Add an append-only `lifecycleAudit[]` to `LegalCase`
  recording actor, timestamp, from-stage, to-stage, and reason for every
  advance. Additive schema/migration only, next free migration number.
- [ ] **3.4 Blocking preconditions API.** Extend `next-step.ts` to return, for
  the current stage, the set of unmet preconditions blocking each candidate
  next step — enough to drive a "what's blocking the next step" panel.
- [ ] **3.5 Determinism test.** Add a test that walks the lifecycle graph and
  asserts no step has its *only* forward edge behind a precondition that no
  reachable event/trigger can satisfy (zero silent dead-ends).
- [ ] **3.6 UI accept/confirm chips.** Surface armed triggers in `Lifecycle.tsx`
  as accept/confirm chips; the human confirms, the system never auto-commits a
  legal deadline.

Human child (`[H]`):

- [ ] **3.7 Counsel review** of each auto-armed deadline trigger — i.e. which
  event starts which clock, and the citation attached to each. Blocks 3.1, 3.2
  and 3.6 from being committed as "live" rather than "draft" proposals.

## 4. Human / architecture / counsel decisions required (gates)

These must be resolved before the corresponding engineering slice ships:

1. **Counsel — clock provenance (blocks 3.1/3.2/3.6).** For each trigger, which
   event legally starts which clock, and which citation/article is authoritative
   (e.g. the 15-day response clock; appeal art. 360; retraction window). Output:
   an event→deadline→citation table signed off by counsel.
2. **Architecture — trigger engine shape.** Event-driven reactor vs. a pure
   function recomputed on each `LegalCase` read. Decision affects testability,
   replay, and how the audit ledger is populated. Recommendation: pure
   derive-then-propose so triggers are deterministic and testable, with the
   ledger written only on human confirm.
3. **Architecture — proposal vs. commit boundary.** Where the "proposed" state
   lives (transient/derived vs. persisted as `draft` rows) and what exactly a
   human "confirm" mutates. Must guarantee no path persists a deadline without a
   confirm event in `lifecycleAudit[]`.
4. **Architecture — audit ledger immutability.** Append-only enforcement,
   retention, and PII posture of the `who` field. Aligns with
   `OPERATING_CANON.md` auditability + private-data-minimization principles.
5. **Product/legal — dead-end policy.** Confirm that "no silent dead-end" means
   *every* step is reachable-forward, OR explicitly enumerate intended terminal
   states (e.g. case closed, withdrawn) the determinism test must allow.

## 5. First safe slice

The smallest correct, fully-reversible, no-legal-judgement step is **3.5 the
determinism test** together with **3.3 the audit ledger scaffold**, because they:

- introduce **no auto-armed legal deadline** (so they need no counsel sign-off
  to be correct), yet
- make the dead-end problem *measurable* (the test gives an immediate, objective
  pass/fail map of the current graph), and
- give every later trigger slice a place to record provenance (the ledger).

Concretely, in juge.ca:

1. Add a read-only graph-reachability test over `lib/litigation/lifecycle.ts`
   asserting zero silent dead-ends (with §4.5's terminal-state allowlist).
   Expect it may fail initially — that failure is the worklist for the trigger
   slices.
2. Add the additive, append-only `lifecycleAudit[]` field to `LegalCase` with
   the next free migration number (no backfill, no destructive change).
3. Land both behind no UI and no auto-commit, so they are safe to merge ahead of
   counsel review.

Slices 3.1, 3.2, 3.6 follow only after the §4.1 counsel table exists; 3.4 (the
blocking-preconditions API) can proceed in parallel once the trigger-engine
shape (§4.2) is chosen.

## 6. Validation for each future slice

- `node_modules/.bin/tsc --noEmit` adds no new type errors in touched files.
- For any i18n strings (chip labels, blocking-reason copy): `npm run check:locales`.
- Migrations are additive-only and use the next free number.
- No edits to `lib/version.ts`; no monetization/compliance flag or attestation
  changes.
