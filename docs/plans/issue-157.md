# Plan — Issue #157: Master Platform Spec v2.5/v2.9 implementation tracker

> **Mode:** PLAN (epic / human-gated). This document is the deliverable. No feature
> code is shipped by this PR.
>
> **Cross-repo note.** Issue #157 lives in the platform repo
> [`PresidentAnderson/juge.ca`](https://github.com/PresidentAnderson/juge.ca/issues/157).
> This plan was authored in the `annoncedenounce.com` launch-site worktree because the
> autonomy loop currently holds the `juge.ca` main checkout (its working tree is dirty,
> including in-flight edits to `lib/version.ts`, which is off-limits). The hard rule
> "work ONLY in your worktree" therefore governs: the plan is committed here, while the
> sub-task checklist below is written against `juge.ca` paths and issues so it can be
> lifted into that repo verbatim when the loop releases the checkout. `Refs #157` in the
> PR points at the juge.ca epic.

## 1. Scope

Issue #157 is the **master implementation tracker** for the platform spec. The issue
body has already advanced the baseline past the title: the live source of truth is the
in-repo spec home `docs/spec/` on branch `docs/spec-v2.9`, baseline **v2.9** covering
Parts 0–XVI and guardrails **G1–G132** (registry rev *v*). The "v2.5 / G1–G101" in the
title is the historical framing; the current target is **v2.9 / G1–G132**.

This is an **epic umbrella**. Its scope is *coordination*, not a single feature:

- Track the tiered build (Tier 0 → Tier 3) and its child epics/issues.
- Hold the architecture invariants and release posture as acceptance gates.
- Sequence the critical path so dependent work is never started early.

**In scope for this tracker issue**
- Maintaining an accurate, checkbox-accurate dependency map of child issues.
- Confirming each tier's entry gate is satisfied before its issues go "Ready".
- Recording the human/architecture/counsel decisions each tier requires (below).

**Explicitly out of scope (delegated to child issues)**
- Any feature implementation — those land under #154, #155, #156, #197, etc.
- Editing the spec text itself — that is the `docs/spec-v2.9` branch's job.
- OPS/agent-handoff harness — tracked separately by #188.

## 2. Current state (from the issue body)

- ✅ **Gate cleared:** #184 (REC-000) — Security Foundation v1.5 folded into Part V
  (renumbered **G102–G118**), civil Parts XV/XVI added, master rebuilt to **v2.9**.
  **Tier 0 is unblocked.**
- ⏳ **Build harness:** #188 — OPS epic (Ready-queue/DAG, claim leases, CI guardrail
  gates, session docs, human gates) + live-ops.

### Tier map (critical-path order)

| Tier | Epic / issues | Entry gate | Status |
|------|---------------|-----------|--------|
| 0 — Foundations | #154 Part V Security (G46–G51 + G102–G118): #128 #129 #130 #131; #132 shared foundation; #153 CI | #184 done | READY |
| 1 — Core platform | #155 Workspace Registry: #140 #141 #142; #149 #150 evidence | Tier 0 merged | blocked |
| 2 — Professional & economy | #133–#139 pro workspaces; #145 marketplace engine; #151 payouts | Tier 1 merged | blocked |
| 3 — Journey/funding/criminal/civil/release | #156 Criminal (CA #146 #147 #148 + US); #143 Journey; #144 Funding; #197 CIV Civil (#192 #193 #194, G119–G132); #152 Settings+release; #195 rollback+rights-lane isolation; #196 live-ops monitoring | Tier 2 merged | blocked |

## 3. Sub-task checklist (tracker maintenance)

These are the recurring actions that keep #157 honest. They are *tracker* tasks, not
feature builds.

- [ ] **Reconcile the tier table** with live child-issue states (open/closed) and fix
      any stale checkboxes in the #157 body.
- [ ] **Confirm Tier 0 readiness** end to end: #154 has #128–#131 + #132 + #153 wired,
      each with explicit acceptance criteria and a `priority:*` label (autonomy
      precondition).
- [ ] **Gate Tier 1** — do not mark #155/#140–#142/#149/#150 "Ready" until Tier 0
      (#154) is merged to `main` and CI #153 guardrail gates are green.
- [ ] **Gate Tier 2** behind Tier 1 merge; **Tier 3** behind Tier 2 merge.
- [ ] **Verify release-posture invariants** are encoded as CI gates in #153, not prose:
      flagged % cohorts + jurisdiction gating, automated rollback to last-known-good on
      threshold breach, **rights lanes isolated from rollback / never down**, and the
      safety asymmetry (safer = autonomous, riskier = human gate only).
- [ ] **Verify the 9 architecture invariants** each have an owning child issue and a
      testable check (esp. invariant 2 "the wall is cryptographic", 3 "fail-closed
      logging", 4 "free A2J floor never paywalled/phase-gated", 8 "civil-law vs
      common-law modeled true — QC/LA never flattened, G127").
- [ ] **Cross-link the OPS harness** (#188): confirm Ready-queue/DAG + claim leases +
      human gates exist before any Tier work is auto-claimed.
- [ ] **Keep the data-boundary distinction explicit** in child specs: "sandbox/synthetic"
      = Developer/BetaTester boundary (G36–G39), **not** a deployment gate.

## 4. Human / architecture / counsel decisions required

This epic is **human-gated**; agents prepare, humans decide. The following must be
recorded (issue comment or ADR) before the dependent slice ships:

1. **Baseline reconciliation (human/architecture).** Confirm the canonical baseline is
   **v2.9 / G1–G132** and retitle/relabel #157 if the "v2.5 / G1–G101" title is now
   misleading. Decide whether older roadmap items (Marketplaces #82/#84/#73/#100, etc.)
   are folded under the tiers or stay independent.
2. **Cryptographic-wall design (architecture + security/counsel).** Invariant 2 + Part V
   (G102–G118): key custody, tenant/jurisdiction isolation boundaries, and the threat
   model. Blocks Tier 0 #154 sign-off.
3. **Free A2J floor (counsel + product).** Invariant 4: the precise, never-paywalled,
   never-phase-gated minimum. Blocks any monetization work in Tier 2 (#145 marketplace,
   #151 payouts).
4. **Civil-law vs common-law modeling (counsel + architecture).** Invariant 8 / G127:
   QC and LA must not be flattened into a common-law model. Blocks #197 (CIV) and any
   jurisdiction-gated release config.
5. **Criminal-justice editions (counsel, per jurisdiction).** #156: CA (#146–#148) and a
   US edition need jurisdiction-specific legal review of allegation-safe language,
   right-of-reply, and takedown posture.
6. **Release-posture & rollback authority (architecture + ops + human).** #195/#152/#196:
   sign off the automated-rollback thresholds, the rights-lane isolation guarantee, and
   who holds the "riskier change" human gate.
7. **Attribution (product).** Invariant 9: author credit "Jonathan Anderson" carried into
   shipped surfaces and spec.

> Per the launch-site Operating Canon, anything touching auth, evidence, moderation,
> legal pages, privacy, right-of-reply, takedown, or publication rules requires
> human/legal review before merge. Most Tier 0/3 work is in that category.

## 5. First safe slice

The smallest correct, non-feature, fully reversible first step — **tracker hygiene that
unblocks the autonomy loop without making any product/legal decision**:

1. **Reconcile #157's checklist with live issue state** (close/check completed items;
   correct the tier table). Pure bookkeeping.
2. **Audit Tier 0 readiness only** (#154 and its children #128–#131, #132, #153):
   confirm each has explicit acceptance criteria + a `priority:*` label so the autonomy
   rules permit an agent to claim it. File a comment listing any missing precondition.
   Do **not** start the work.
3. **Encode the release-posture invariants as a CI checklist stub in #153's spec**
   (assertions to implement), so the gates exist as requirements before Tier 0 code
   lands. No flag flips, no attestation changes — requirements text only.

Everything beyond step 3 is blocked on the §4 human/counsel decisions and on Tier 0
being merged. This slice changes no runtime behavior, touches no monetization/compliance
gate flags or attestations, and adds no migrations.

## 6. Constraints honored

- No edits to `lib/version.ts`.
- No monetization/compliance gate flags or attestations flipped.
- No migrations (none needed; if later required, additive-only with the next free
  number).
- Touches only this plan doc — no feature code in this PR.
