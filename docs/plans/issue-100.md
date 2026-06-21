# Plan — Issue #100: Lifecycle freemium (Dispute vs Matter + conversion funnel)

> Status: **PLAN ONLY** (epic, human-gated). This document is the deliverable; no
> feature code ships in this PR. The implementation lives in the **juge.ca**
> application repository, where the data model, migrations, entitlements, and
> billing already exist. This repo (`annoncedenounce.com`) is the public launch
> site and reference-pattern mirror, so the plan is recorded here per the
> Operating Canon (`docs/OPERATING_CANON.md`, "Reference implementation
> patterns: juge.ca").

Source issue: `PresidentAnderson/juge.ca#100` (labels: `epic`, `architecture`,
`area:marketplace`, `priority:high`; milestone: *Phase 3 — GA*).
Builds on: Conflict-OS (#86), lifecycle taxonomy (#98).
Touches: marketplaces (#73 / #82 / #84), advance-the-matter workflow (#91),
referral-fee compliance (#60).

---

## 1. Goal / why

Reframe pricing around the **dispute lifecycle** so a lawsuit becomes a
*monetization event, not the entry point*. This expands the addressable market
from "people who already need litigation" to "anyone with a conflict."

The lever is a deliberate split of one object into two:

- **Dispute** — the conflict record: communications, evidence, negotiation,
  ombudsman, mediation (everything *pre-litigation*).
- **Matter** — the legal file: court procedures, litigation workflow, hearings,
  enforcement (everything *litigation and after*).
- A Dispute can convert into **one or more** Matters.

Free tier ("Citizen Access") is intentionally generous on disputes and scarce on
matters: **25 active disputes, 1 matter, 5 GB**. 25 ≫ 5 is deliberate — it
builds habit and data lock-in so leaving costs more than upgrading. The paid
moment is *escalation to litigation*, where willingness-to-pay is highest.

## 2. Current state (juge.ca, observed)

- `matter` is already a first-class object with collaboration, shares + RLS,
  audit chain, marketplace order links, deadline engine, and activity feed
  (migrations through `0067_matter_activity.sql`). **Next free migration number
  is `0068`.**
- There is **no separate `dispute` object** yet. Pre-litigation work is currently
  modeled inside matters.
- A provider **marketplace** exists (`0055`, `0056`, `0061`) and is the home for
  referral commissions.
- Subscriptions / billing-entitlements are tracked under the
  `feat/billing-entitlements` worktree + subscriptions migration referenced in
  the issue (the issue cites "migration 0037"); reconcile against the live
  numbering before writing the entitlements migration.

> All migrations are **additive-only**; reuse of the matter taxonomy is preferred
> over a parallel schema where the two objects genuinely share fields.

## 3. Scope

### In scope (this epic, sequenced)
1. Dispute / Matter object split (foundational, Phase 1).
2. Quotas + entitlements (free: 25 disputes / 1 matter / 5 GB).
3. Conversion-point UX (escalation prompts) wired into advance-the-matter (#91).
4. Conversion-funnel instrumentation (Dispute → Demand Letter → Escalation →
   Matter → Professional Referral).
5. Billing live via Stripe (Phase 3).
6. Referral commissions on professional referrals (compliance-gated, #60).

### Out of scope
- Changing legal posture, attestations, or compliance gates (Operating Canon §
  "Sovereign Autonomy Rules" — auth/evidence/moderation/legal require human +
  legal review).
- Pricing numbers as *commitments* — the table below is a planning input, not a
  launched price (final pricing is a business decision, §6).
- Any code in this repo. The annoncedenounce.com site only gains pricing/landing
  copy *after* the model and entitlements are real in juge.ca, as a later, small
  follow-up.

## 4. Sub-task checklist (each becomes its own issue/PR in juge.ca)

**Phase 1 — Data model (prerequisite, blocks everything)**
- [ ] Decision: extract `dispute` as a new table vs. introduce a `kind`
      discriminator on the existing matter taxonomy (see §5, Decision A).
- [ ] Migration `0068_dispute_objects.sql` (additive): `dispute` table + the
      `dispute → matter` conversion link (1 dispute → many matters), with RLS
      mirroring matter shares.
- [ ] Backfill/compat path: existing pre-litigation matters either remain valid
      or are mapped to disputes (no destructive change).
- [ ] App layer: dispute CRUD, dispute timeline, dispute → matter conversion
      action (preserving evidence/timeline/comms continuity).

**Phase 2 — Quotas + entitlements**
- [ ] Reconcile the actual subscriptions/entitlements migration number (issue
      says 0037; verify against live schema) and extend entitlements with
      `dispute_quota`, `matter_quota`, `storage_quota_gb`.
- [ ] Seed Free = {25 disputes, 1 matter, 5 GB}; Plus = {100, 10, 50 GB};
      Professional = {unlimited, unlimited, expert tools}.
- [ ] Enforcement: server-side quota checks on dispute create, matter create,
      and evidence upload — fail closed, with a clear "limit reached" signal the
      UI can turn into an upgrade prompt.
- [ ] "Active dispute" definition: confirm what counts toward the 25 (open vs.
      archived/resolved) — see §5, Decision B.

**Phase 3 — Conversion UX**
- [ ] Detection rules for "this dispute may now need legal intervention":
      customer-service/escalation/mediation failure, expiring limitation period,
      or a legal threshold. Wire into advance-the-matter (#91) + resolution
      engine.
- [ ] Escalation prompt → two CTAs: **Self-represent** (pay-per-matter $49–99,
      generate procedures/evidence/timelines) or **Hire a professional**
      (marketplace referral).
- [ ] Supplemental-matter purchase flow (everyone gets 1 free matter).

**Phase 4 — Instrumentation (do early, cheap)**
- [ ] Funnel events: dispute_created → demand_letter_generated →
      escalation_detected → matter_created → referral_initiated. Privacy-min:
      identifiers, not content.

**Phase 5 — Billing (Stripe, Phase 3 / GA)**
- [ ] Plus / Professional subscriptions; add'l dispute ($5–10); add'l matter
      ($49–99). Webhook → entitlement sync.

**Phase 6 — Referral commissions (compliance-gated)**
- [ ] Commission on lawyer/paralegal/mediator/bailiff/commissioner/expert
      referrals — **blocked on #60** and counsel sign-off (§6).

## 5. Architecture decisions required (human / engineering)

- **A. Dispute as new table vs. discriminator on matter.** Separate table is
  cleaner conceptually and matches the issue's framing, but matter already
  carries shares/RLS/audit/deadlines/activity — duplicating that surface is
  costly. Recommendation to evaluate: new `dispute` table that *reuses* the
  shared substrates (audit chain, shares pattern) rather than forking them.
- **B. What counts as an "active" dispute** toward the 25-cap (lifecycle state
  machine: open / on-hold / resolved / archived). Drives the entitlement check.
- **C. Conversion preserves the chain of custody.** Dispute → Matter must carry
  evidence, timeline, and comms without breaking the audit chain (`0045`,
  `0062`) or legal-hold guards (`0060`).
- **D. Entitlement enforcement point** (DB policy vs. service layer vs. both) and
  fail-closed behavior on quota checks.

## 6. Counsel / business decisions required (gated — do NOT decide in code)

- **Referral-fee revenue is regulated** (Barreau du Québec / Chambre des
  notaires). Commission on professional referrals must clear #60 + counsel
  before any commission logic ships. Build the referral *plumbing* without the
  fee until cleared.
- **Final pricing** (Free/Plus/Professional, add'l dispute/matter ranges) is a
  business commitment, not an engineering default.
- **Self-represent UX must not constitute legal advice** — review the escalation
  copy and generated-procedure framing with counsel (unauthorized-practice risk).
- **Storage cap (5 GB) interaction with evidence-retention / legal-hold** — a
  quota must never silently delete or block held evidence.

## 7. First safe slice (smallest correct, non-gated start)

**Instrumentation-only, in juge.ca, behind no compliance gate:**

Add the conversion-funnel event taxonomy (Phase 4) — emit
`dispute_created`, `demand_letter_generated`, `escalation_detected`,
`matter_created`, `referral_initiated` against the *existing* matter/demand-letter
flows (mapping today's pre-litigation matters as the dispute stand-in until the
object split lands).

Why this first:
- Additive, reversible, touches no schema-of-record and no compliance/monetization
  gate.
- Produces the baseline funnel data needed to validate the 25-vs-1 hypothesis
  *before* committing to the larger object split and pricing.
- Unblocks Phase 1 design with real numbers and zero legal exposure.

Definition of done for the slice: events fire end-to-end, are queryable, contain
identifiers only (no evidence content), and ship behind the standard review gate.

## 8. Sequencing summary

1. Object split (Phase 1) — foundational; ties #86 / #98.
2. Quotas + entitlements (Phase 2).
3. Conversion UX (Phase 3) — ties #91 + resolution engine.
4. Billing live, Stripe (Phase 5) — GA.
5. Referral commissions (Phase 6) — gated on #60 + counsel.

Instrumentation (Phase 4 / §7) runs *alongside* from the start.
