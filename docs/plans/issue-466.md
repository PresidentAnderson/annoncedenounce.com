# Plan — Issue #466: [epic] Rich: Outcome analytics & non-advisory insights

Status: PLAN (epic / human-gated). This document is the deliverable. No feature
is built here. It scopes the epic, breaks it into a concrete sub-task checklist,
enumerates the human / architecture / counsel decisions that must precede any
live insight, and defines the first safe slice.

Refs #466.

## 0. Repository context and where this epic actually lands

Issue #466 is authored against the **application** layer (matter timelines,
benchmarking, an Analytics Agent, DB roles / RLS, jurisdiction cohorts). It
cross-links application-internal work items (`#377` Vol X Analytics Agent;
`#100` + `#98` data feeds; `#129` audit). None of that compute, storage, or
agent infrastructure exists in **this** repository.

This repository (`annoncedenounce.com`) is the **static public launch surface**:
`index.html`, `privacy.html`, a version-governance system, and Vercel hosting
(see `README.md` and `docs/OPERATING_CANON.md`). Its canon explicitly names
`juge.ca` as the "reference implementation patterns" source and inherits its
product-safety principles: evidence-first, allegation-safe language, privacy
data-minimization, auditability, and human/legal review for anything touching
legal posture.

Consequence: the analytics engine, Analytics Agent, RLS enforcement, and cohort
math belong in the application repo. What this repo can own — safely, without an
architecture build — is the **public-facing, non-advisory disclosure contract**
that the same insights must honour wherever they render. Keeping the disclosure
contract authored next to the public privacy/legal pages keeps the "descriptive,
never advisory" guarantee where users and counsel actually read it.

This plan therefore has two tracks:

- **Track A (application repo):** the engineering children `[A]` of #466. Listed
  here for completeness and sequencing; built and reviewed there.
- **Track B (this repo):** the public disclosure + principles surface that the
  insights feature must conform to. This is the only track with a safe first
  slice that fits this repository.

Per the orchestrator's HARD RULES, no code is changed in this PR beyond adding
this plan doc. No monetization/compliance gate flags, attestations, migrations,
or `lib/version.ts` are touched (none exist in this repo regardless).

## 1. Scope (from the issue)

**Goal.** Descriptive outcome orientation that no free tool offers, inside the
non-advisory boundary: matter timelines, anonymized benchmarking ("matters like
this typically move through these stages"), and confidence-scored,
provenance-stamped insights.

**Hard guardrails (non-negotiable, copied from the issue):**

1. Descriptive only — never predictive-as-advice ("you will win" is forbidden).
2. Every insight carries a **confidence + provenance envelope** (sample size,
   jurisdiction, recency, model) and a **not-advice notice**.
3. Benchmarks are anonymized with a **hard minimum-cohort gate** (Law 25 /
   PIPEDA / GDPR). Below threshold → literally "not enough data", never a number.
4. The Analytics Agent is **READ-ONLY on prod** (enforced by DB role / RLS, not
   by convention). A write attempt must be **denied in a test**.
5. **Jurisdiction-honest:** aggregate only within a `live` cohort; staged
   editions show "not yet available here".
6. **No fabricated stats** — "not enough data" wins over any guessed number.

**Out of scope:** any predictive scoring presented as advice; any cross-cohort
or cross-jurisdiction aggregation; any insight that ships before the human gate
in section 3 is cleared.

## 2. Sub-task checklist

### Track A — application engineering (built in the application repo)

- [ ] **A1 — Matter timeline view.** Milestones + evidence + deadline events,
      exportable. Date-conflict surfacing: when two sources disagree on a date,
      show both and flag the conflict; never silently pick one.
- [ ] **A2 — Anonymized benchmarking with a hard minimum-cohort gate.** Single
      shared threshold constant; cohort size below threshold returns the
      "not enough data" sentinel, never a rounded/suppressed number.
- [ ] **A3 — Confidence + provenance envelope.** Every insight payload carries
      `{ sampleSize, jurisdiction, recency, model, confidence }` plus the
      not-advice notice. No insight may render without a complete envelope.
- [ ] **A4 — Read-only enforcement.** Dedicated DB role / RLS policy so the
      analytics path physically cannot write to prod. Ship a test that asserts a
      write attempt is **denied**.
- [ ] **A5 — Jurisdiction-honesty guard.** Aggregate strictly within one `live`
      cohort. Staged / non-live editions return "not yet available here" rather
      than borrowing another jurisdiction's data.
- [ ] **A6 — Audit hooks.** Wire insight generation into the existing audit
      trail referenced by `#129` (what was computed, from which cohort, when).

### Track B — public disclosure surface (this repo; safe to author here)

- [ ] **B1 — Non-advisory disclosure contract.** A short, versioned,
      human-readable statement of the six guardrails above, written so counsel
      can review it and so the application can link to it as the canonical
      "what our insights are / are not" notice. Lives beside `privacy.html`.
- [ ] **B2 — Cross-link from privacy.** Reference the disclosure contract from
      the privacy page's data-handling / analytics section so the
      minimum-cohort / anonymization promise is discoverable.
- [ ] **B3 — Verifier coverage.** Once B1/B2 ship as content, extend
      `scripts/verify-site.mjs` to assert the disclosure page exists, is linked,
      and contains the not-advice notice — so it cannot silently regress.

(Track B is listed for sequencing only. **Nothing in Track B is built in this
PR** — this PR is the plan. The first slice in section 4 is the entry point.)

### H — human gate (blocks all of the above going live)

- [ ] **H1 — Counsel + privacy review** of the methodology, the cohort threshold
      value, and the disclosure wording **before any insight ships live**.

## 3. Decisions required before build (human / architecture / counsel)

These are open questions; an agent must not decide them.

**Counsel / privacy (H1):**

- **C1. Minimum-cohort threshold value.** The exact N below which we say
  "not enough data". Must satisfy Law 25 / PIPEDA / GDPR anonymization. Needs a
  privacy/legal sign-off, not an engineering guess.
- **C2. Disclosure wording.** Exact non-advice notice and confidence-envelope
  phrasing that counsel will stand behind, in both FR and EN (this is a
  bilingual / Québec-facing product per `privacy.html`).
- **C3. "live" cohort definition.** Which jurisdictions/editions are `live`
  enough to aggregate, and what staged editions display instead.

**Architecture:**

- **R1. Where the disclosure contract is canonical.** This plan proposes this
  repo (next to privacy). Confirm vs. hosting it in the application repo and
  having this repo mirror it. Pick one source of truth to avoid drift.
- **R2. Read-only enforcement mechanism.** DB role vs. RLS policy vs. both, and
  how the "write denied" test is wired into CI for the application repo.
- **R3. Envelope schema ownership.** Where `{sampleSize, jurisdiction, recency,
  model, confidence}` is defined so timeline, benchmarking, and any future
  insight share one shape (and one validator that rejects incomplete envelopes).
- **R4. Provenance / audit linkage to `#129`.** Confirm the audit format so
  insight provenance is queryable later.

## 4. First safe slice

The smallest correct, reviewable, non-advisory step — and the only slice that
belongs in this repository:

> **Author the non-advisory disclosure contract (B1) as a static, versioned
> page beside `privacy.html`, stating the six guardrails verbatim, with explicit
> placeholders for the counsel-owned values (cohort threshold C1, final wording
> C2, live-cohort list C3), then cross-link it from the privacy page (B2) and
> add verifier coverage (B3).**

Why this is safe:

- It ships **no statistics, no benchmarks, no insights** — it only states what
  insights will and will not be, so there is nothing to fabricate and no cohort
  to under-protect.
- It is descriptive and non-advisory by construction.
- It surfaces the counsel-owned blanks (C1–C3) as visible placeholders, so the
  human gate H1 is forced before anything numeric can render — matching this
  repo's existing pattern of bracketed `[…]` legal placeholders in
  `privacy.html`.
- It matches existing conventions (static page + privacy cross-link + verifier
  assertion) and adds no runtime/agent surface.

**Explicitly deferred to the application repo and to H1:** the analytics engine,
the Analytics Agent, RLS / read-only enforcement and its denial test, cohort
math, the timeline view, and any live numbers. None of those may proceed until
C1–C3 are answered and H1 is signed off.

## 5. Acceptance criteria for the epic (definition of done)

- Timeline view exports and surfaces date conflicts without silently resolving.
- Benchmarking returns "not enough data" below the counsel-approved threshold,
  and never a substitute number.
- No insight renders without a complete confidence + provenance envelope and the
  not-advice notice.
- A test proves the analytics path's write is **denied** at the DB layer.
- Staged jurisdictions show "not yet available here"; only `live` cohorts
  aggregate.
- The public disclosure contract is live, linked from privacy, verifier-guarded,
  and counsel-approved (H1 signed).
