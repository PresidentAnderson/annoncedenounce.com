# Issue #64 — Phase 2: Public beta (Oct 2026) — 1,000 users (epic plan)

> Mode: **PLAN** (epic / human-gated). This document is the deliverable. It is the
> coordinating plan for the Phase 2 milestone; the underlying build is fanned out
> into existing child issues (mostly in the **juge.ca** application repo). No
> feature is built here.
>
> Source of truth: `juge.ca` `ROADMAP.md` §5 (Phase 1 exit gate), §6 (production),
> §7.1/§7.4/§7.5 (beta targets, dates, Track-B consolidation), §10 (dated phase
> table). Issue #64 lives in `PresidentAnderson/juge.ca`; this static-site repo
> carries the plan + PR so the epic has a tracked deliverable (same pattern as the
> sibling plan PRs in this repo).

## Goal (the gate)

Per ROADMAP §10, Phase 2 = **Public beta, Oct 2026, 1,000 users**, with the
betas **staggered** (attorneys Aug — #63; public Oct — this issue). Phase 2 is
not "open the floodgates": 1,000 is deliberately small (§7.1) so completion,
abandonment, and support load are **measurable** and user interviews are feasible
before GA (#... Phase 3).

Issue #64 checklist (verbatim from the tracking issue):

- [ ] Procedure-Generation (M4 / #14)
- [ ] Integration handoff (engine → marketplace → shared dossier)
- [ ] Harden Track A: EN i18n, Stripe webhooks, real analytics
- [ ] Instrument completion / abandonment / support load; run user interviews

Exit gate: **1,000 active users · no open P0/P1 · metrics in place.**

## Where Phase 2 sits relative to Phase 1 (#63)

Phase 2 is **gated on Phase 1's exit gate** (ROADMAP §5): 7 engine modules at
DoD (or descope signed off), end-to-end dossier flow, the integration handoff,
load/perf at target concurrency, full legal + privacy review, and automated (or
staffed) attorney verification. Anything not closed in #63 carries into Phase 2.
This plan therefore tracks **only the Phase-2-specific deltas** on top of #63, not
the whole engine build.

## Scope

In scope (Phase 2 deltas, delivered via children — see checklist below):

1. **Procedure-Generation (Track B M4)** reaches public-beta quality — the
   pleadings layer (CaseTheory / MotionPackage / DraftJudgment) usable by
   self-represented litigants, not only attorneys. (M4 was the last engine module
   in #63's build order; #14 is the original tracking issue — now MERGED — so
   Phase-2 work here is hardening + public-facing exposure, not greenfield.)
2. **Integration handoff** (engine → "find an attorney" → scoped dossier share)
   is exercised by the **public** cohort, not just attorneys — the strategic
   payoff in ROADMAP §1. Tracked by the juge.ca A→Z **Matter↔Marketplace bridge**
   epic (#459).
3. **Track A hardening** for a public audience: complete **EN i18n**, finish
   **Stripe webhooks**, replace **mock admin analytics** with real analytics
   (ROADMAP §5 "Track A in parallel"). Related juge.ca issues: i18n QA (#502),
   marketing-claim accuracy (#589), product-polish epic (#416).
4. **Beta instrumentation**: completion / abandonment / support-load metrics +
   a user-interview cadence (§7.1). This is the measurement apparatus that makes
   1,000 a *useful* number.

Explicitly **out of scope** (defer to GA / Phase 3 or human owners):

- **Billing live** (Stripe production subscriptions, the §7.2 Consumer/Pro/Lawyer
  tiers) — that is GA (ROADMAP §6), not public beta. **Do not** flip monetization
  gate flags as part of Phase 2.
- Opening registration fully / removing the invite gate beyond the 1,000 cap.
- Backups/DR drills, SLO soak, external pen test — GA exit-gate items (§6).
- Jurisdiction expansion (Phase 4 / #417) and the "Rich"/A→Z beyond-MVP epics
  (#462, #470) except where a specific child is already pulled into Phase 2.

## Sub-task checklist (epic → children)

Legend: **[A]** = agent-buildable additive slice · **[H]** = human / counsel /
ops decision · all engine code lives in **juge.ca** unless noted.

- [ ] **[A] Procedure-Generation public-beta hardening** — M4 pleadings layer
      stable, bilingual, with UPL framing intact for the public cohort
      (descendant of #14, MERGED). Gate any not-yet-ready surface behind a
      "coming soon" state (#416) rather than shipping half-built UI.
- [ ] **[A] Integration handoff for the public cohort** — engine → marketplace →
      scoped dossier share, validated end-to-end from a *self-rep* starting point
      (juge.ca #459). Confirm scoped-access RLS holds for public users, not only
      attorney-initiated flows.
- [ ] **[A] EN i18n completion** — eliminate English-fallback gaps and hardcoded
      strings on public surfaces (juge.ca #502); align public copy with shipped
      capability (#589) so the beta does not over-promise.
- [ ] **[A] Stripe webhooks** — finish webhook handling so subscription/consult
      state is reliable. *Wiring only*; **no** live-billing flag flip (that's GA).
- [ ] **[A] Real admin analytics** — replace the mock admin analytics with real
      data feeding the completion/abandonment/support dashboards.
- [ ] **[A] Beta instrumentation** — event taxonomy for funnel completion,
      abandonment points, and support-ticket load, surfaced on a Phase-2
      dashboard. Pure/event-emit additive work; no PII beyond existing posture.
- [ ] **[H] User-interview program** — recruit from the 1,000 cohort, schedule,
      synthesize. Human/research, not code.
- [ ] **[H] P0/P1 triage to zero** — the "no open P0/P1" gate is an operational
      sign-off, not a code change.
- [ ] **[H] 1,000-user recruitment + invite-cap policy** — growth/ops owns the
      cohort fill and the cap enforcement decision.

## Decisions required before/while building

**Human / ops (blocking the gate):**
- Who owns recruiting + capping the 1,000-user cohort, and how the invite gate
  enforces the cap (vs. Phase 1's attorney invite list, #63).
- The "no open P0/P1" definition and sign-off owner for the exit gate.
- Confirmation that Phase 2 stays **pre-billing** — public beta does **not** flip
  the §7.2 monetization tiers live (that is GA, ROADMAP §6).

**Architecture:**
- Analytics backend choice + event schema for completion/abandonment/support, and
  how it satisfies Loi 25 (data minimization, Canadian-region storage per §7.5)
  for a public (not attorney-vetted) cohort.
- Where the public-vs-attorney handoff differs in the RLS / scoped-share model
  (#459) — a self-rep granting an attorney access is the inverse of Phase 1's
  attorney-initiated flow and must be re-validated.
- Stripe webhook idempotency + reconciliation strategy (so wiring it now does not
  later collide with the GA live-billing slice).

**Legal / counsel:**
- UPL posture for Procedure-Generation exposed to the **public** (§3.1 framing) —
  generated pleadings/draft judgments must remain non-advisory; any attestation
  must be **human-asserted**, never auto-asserted by code.
- Privacy review sign-off for the public cohort's analytics + dossier data
  (extends the Phase-1 legal/privacy review, ROADMAP §5 exit gate).
- Public-facing copy accuracy (#589) — beta claims must match shipped capability.

## First safe slice

The smallest correct, production-quality, **non-gated** change: stand up the
**beta instrumentation event taxonomy** (in juge.ca) — define and emit the
completion / abandonment / support-load events, behind no monetization or
compliance flag.

- Add a small, typed event-name enum + emit calls at the funnel boundaries
  (start dossier, key module completions, abandonment/exit, support-ticket open).
- Emit only existing-posture data (no new PII); land the schema + unit coverage
  first, wire the dashboard read-side second.
- Flip **no** flags, add **no** billing, touch **no** `lib/version.ts`,
  attestations, or compliance gates; any DB change is **additive-only** with the
  next free migration number in the juge.ca tree.

This is safe because it only **adds measurement** — the apparatus the whole
phase is judged by ("metrics in place") — without enabling any public-facing or
monetized behaviour. It also de-risks every later slice by giving the
completion/abandonment dashboard a data source on day one. The next slice is
EN i18n completion (#502) + claim-accuracy alignment (#589), since over-promising
copy is the cheapest beta-killer to remove.

## Acceptance (epic)

Phase 2 is met when, per ROADMAP §10: **1,000 users are active**, **no P0/P1 is
open**, and **completion / abandonment / support-load metrics are in place** and
have been reviewed — Procedure-Generation and the engine→marketplace handoff work
for the public cohort, Track A is hardened (EN i18n, Stripe webhooks, real
analytics), and the user-interview program has produced findings to inform the
GA (Phase 3) go/no-go. Billing stays off until GA.
