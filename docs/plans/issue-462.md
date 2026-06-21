# Plan — Issue #462: [meta-epic] Beyond MVP — A→Z lifecycle completeness

> Mode: **PLAN** (epic / human-gated). This document is the deliverable. It does
> **not** build the feature. It scopes the work, breaks it into a concrete
> sub-task checklist, names the human / architecture / legal-counsel decisions
> that must precede any build, and defines the first safe slice.

## 1. Context & scope

`annoncedenounce.com` is today a **static launch site** (HTML + assets + a
single `/api/version` Vercel function), governed by the Sovereign Autonomy Pack
and the [Operating Canon](../OPERATING_CANON.md). It is the public front door
for a product whose full A→Z lifecycle is described in the *Annonce Denonce —
Full Site Development Plan* and mirrors, scaled down, the `juge.ca` reference
platform.

"Beyond MVP — A→Z lifecycle completeness" is the meta-epic that takes the
product from "landing page + waitlist" to a complete, lawful denunciation /
whistleblowing lifecycle: **intake → triage / pre-moderation → publication →
right-of-reply → resolution / takedown → audit & retention**.

Because this is the static front-door repo, this epic is **mostly upstream of
code here**. The job of this plan is to (a) decompose the lifecycle, (b) flag
every gate where a human, an architect, or legal counsel must decide before an
agent may implement, and (c) identify the one slice that is safe to ship from
*this* repo without any of those decisions.

### Hard constraints carried into every sub-task
- Never edit version metadata by hand (`package.json`, `version.json`,
  `index.html` footer) outside the bump script. (This repo has no
  `lib/version.ts`; the equivalent is `version.json` + the footer.)
- Never flip monetization / compliance gate flags or attestations.
- Any data-store work is **additive-only**, using the next free migration
  number when a backend exists. No backend exists in this repo yet.
- Per the Operating Canon, **anything touching auth, evidence, moderation,
  legal pages, privacy, right-of-reply, takedown, or publication rules requires
  human / legal review before merge.** Agents prepare; they do not set legal
  posture.

## 2. Lifecycle decomposition (the "A→Z")

| Stage | What it covers | Primary risk class |
|-------|----------------|--------------------|
| A. Intake | Submitter identity model (anonymous vs. attributable), evidence upload, consent capture | Privacy / Loi 25 / RGPD |
| B. Triage & pre-moderation | Human review queue, allegation-safe language checks, duplicate/abuse detection | Defamation / moderation |
| C. Publication | What becomes public, redaction, allegation framing, jurisdiction gating | Defamation / legal posture |
| D. Right-of-reply | Notifying identifiable parties, accepting rebuttals, linking replies to claims | Procedural fairness / legal |
| E. Resolution & takedown | Correction, retraction, takedown handling, dispute workflow | Legal / compliance |
| F. Audit & retention | Decision log, retention windows, data minimization, export/erasure requests | Loi 25 / RGPD |
| G. Governance | Versioning, release gates, autonomy guardrails, monetization gates | Compliance / governance |

## 3. Sub-task checklist (epic backlog)

Each item below is a **future child issue**, not work to do in this PR. Items
marked 🔒 are human/legal-gated and must not be auto-implemented.

- [ ] **A1** 🔒 Decide submitter identity model (anonymous, pseudonymous,
      attributable) and consent text. (Counsel + product.)
- [ ] **A2** Define evidence-upload data model (file types, size, virus scan,
      storage location/region). Additive schema only. (Architecture.)
- [ ] **A3** Intake form UX + first-party (cookieless) capture path, mirroring
      the existing consent-gated HubSpot pattern in `index.html`.
- [ ] **B1** 🔒 Pre-moderation queue policy: who reviews, SLA, allegation-safe
      language rules. (Counsel + ops.)
- [ ] **B2** Moderation tooling data model + audit hooks. Additive only.
- [ ] **C1** 🔒 Publication rules: what is public, redaction defaults,
      jurisdiction gating, allegation framing. (Counsel — legal posture.)
- [ ] **C2** Public allegation page template (SEO/JSON-LD parity with current
      static pages, allegation-safe copy).
- [ ] **D1** 🔒 Right-of-reply procedure for identifiable parties. (Counsel.)
- [ ] **D2** Reply data model + linkage to original claim. Additive only.
- [ ] **E1** 🔒 Takedown / retraction / dispute workflow and legal triggers.
      (Counsel.)
- [ ] **F1** 🔒 Retention windows + data-minimization policy; subject-access /
      erasure handling (Loi 25 / RGPD). (Counsel + DPO.)
- [ ] **F2** Decision audit log schema. Additive only.
- [ ] **G1** 🔒 Monetization gate posture (do **not** flip any flag here).
      (Product + finance + counsel.)
- [ ] **G2** Extend `scripts/verify-site.mjs` and CI to cover any new public
      surfaces as they land (this repo's enforceable gate).
- [ ] **G3** Architecture decision: does the lifecycle backend live in this
      repo, in `juge.ca`, or in a new service? (Architecture — see §4.)

## 4. Decisions required before any build (the gates)

These block the epic. None can be resolved by an autonomous agent.

1. **Architecture / repo boundary (G3).** Is `annoncedenounce.com` a thin
   static front end that calls a separate platform (likely the `juge.ca`-style
   app), or does it grow a backend? Everything downstream depends on this. The
   `canon.lock.yaml` already names `juge.ca` as the reference implementation,
   which strongly suggests this repo stays static and the lifecycle lives
   elsewhere. **Recommendation to confirm:** keep this repo static; build the
   lifecycle in the platform repo; this repo only links to it.
2. **Legal posture (C1, D1, E1, F1, A1).** Defamation exposure, allegation
   framing, right-of-reply procedure, takedown triggers, and retention windows
   are all counsel decisions. The current `privacy.html` already carries
   bracketed `[…]` placeholders (legal entity, retention periods) awaiting a
   lawyer — those must be resolved as part of F1.
3. **Data residency & DPO (A2, F1).** Region is `Quebec, CA` (Loi 25). Storage
   location and erasure handling need a DPO sign-off.
4. **Monetization gate (G1).** Out of scope to change in any agent PR; flagged
   so it is not silently coupled to lifecycle work.

## 5. First safe slice (shippable from THIS repo, no gate)

The only lifecycle work that is safe to ship from this static repo **without**
any of the §4 decisions is **documentation / governance scaffolding** that does
not assert any legal posture and changes no flags, version metadata, or public
copy. This plan doc is that slice.

Concretely, the first implementable child issue should be **G2-prep**: a
docs-only lifecycle map (this file) plus, in a *follow-up* PR once G3 is
decided, a stub `docs/lifecycle/` index that links each stage to its owning
repo/issue. No code, schema, copy, or flag changes until the §4 gates clear.

What is explicitly **out of scope** for this PR: any intake form, any backend,
any schema, any change to `index.html` / `privacy.html` copy, any flag, any
version bump.

## 6. Acceptance for the epic (definition of done)

The meta-epic #462 is "done" when every stage A–G has: an owning repo, a
counsel-cleared policy where 🔒 applies, an additive data model where state is
persisted, an audit entry, and a verifier/CI check guarding its public surface.
Each child issue carries its own `priority:*` label and acceptance criteria per
the Operating Canon, and passes the PR review gate.

---
Refs #462
