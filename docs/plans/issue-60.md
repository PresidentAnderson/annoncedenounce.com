# Plan — Issue #60: [config] Enable attorney marketplace monetization

Status: PLAN (config + compliance gate, human/counsel-gated). This document is the
deliverable. It does **not** enable monetization and does **not** flip any
monetization, compliance, or attestation flag.

## Repo placement note (read first)

Issue #60 is a `config` + `compliance` + `area:marketplace` issue in
`PresidentAnderson/juge.ca` (the legal-services application). This worktree is the
**`annoncedenounce.com` static launch site** (HTML + Vercel; no `lib/`, no
database, no payments backend, no feature-flag layer, no migrations).
`docs/OPERATING_CANON.md` references `juge.ca` only as a *reference implementation
pattern* for this site.

The gate this issue asks about lives entirely in `juge.ca` and cannot be enabled
here, and the "stay in YOUR worktree only" rule forbids editing `juge.ca` from this
worktree. Independently, the autonomy HARD RULES forbid flipping
monetization/compliance gate flags or attestations — which is precisely what
"enable" would require. Per the autonomy fallback, this PR carries the config plan
so #60 has a tracked PR and the work is routed to the correct repo and the correct
(human/counsel) decision-makers.

This is the **leaf `[config]` issue** under epic #413
(`docs/plans/issue-413.md`), which covers the broader fee/referral + payout
program. #60 is specifically the `lawyer`-kind monetization switch.

## What the issue asks (verbatim intent)

> Status panel shows attorney marketplace monetization **not set up**. Driven by
> `lib/trust/release-readiness.ts` (`attorneyMarketplaceMonetization`).
> To enable: `ATTORNEY_MARKETPLACE_MONETIZATION_LIVE=1` **and** the
> attorney-ethics-approved gate. See `lib/legal/attorney-marketplace-policy.ts`.
> ⚠️ **Compliance:** Québec attorney advertising/referral-fee ethics must be
> cleared before monetizing.

"Done" = the trust status panel reports `attorneyMarketplaceMonetization: true`
in production, which unblocks the `lawyer` paid-checkout lane.

## Why this is NOT a code change today

Enabling the gate is **not** a code edit — the code is already built and correct.
It is a two-part **operational + counsel** action:

1. A Québec (and per-jurisdiction) attorney-ethics memo must be approved, setting
   `ATTORNEY_ETHICS_MEMO_APPROVED=1`. This is a **legal/counsel** decision, not an
   engineering one.
2. The live switch `ATTORNEY_MARKETPLACE_MONETIZATION_LIVE=1` must be set in the
   production environment **after** (1).

Both are environment/attestation flips that the HARD RULES explicitly prohibit an
autonomous agent from making. Shipping a code patch that hard-codes "on" would
bypass the very compliance wall the system is designed to enforce — so the safe,
production-quality action is to document the gate, the prerequisites, and the
clean activation path, and leave the flip to the accountable humans.

## Current state (verified read-only in `juge.ca`)

- **Composite gate** — `trustReadinessServices()` in
  `lib/trust/release-readiness.ts` computes
  `attorneyMarketplaceMonetization: attorneyEthicsApproved && attorneyMonetizationRequested`,
  i.e. the panel turns green **only** when BOTH
  `ATTORNEY_ETHICS_MEMO_APPROVED` AND `ATTORNEY_MARKETPLACE_MONETIZATION_LIVE`
  are truthy. The double-gate is intentional and must be preserved.
- **Policy guardrail** — `attorneyMarketplaceMonetizationEnabled()` in
  `lib/legal/attorney-marketplace-policy.ts` requires the same two flags.
  `ATTORNEY_MARKETPLACE_POLICY` records
  `status: "blocked_pending_counsel"`,
  `currentFeeModel: "professional_saas_subscription"`,
  `blockedFeeModels: [percentage_of_legal_fee, success_fee, unapproved_per_lead,
  unapproved_per_matter]`, and
  `launchJurisdictionsRequiringMemo: [QC, CA, NY, NJ, CT, US-federal]` with the
  required memo topics (lawyer-referral rules, fee splitting with non-lawyers,
  attorney advertising/ranking disclosures, required registrations, UPL /
  no-attorney-client-relationship copy).
- **Checkout enforcement** — `evaluateOpsKindCheckout()` in
  `lib/litigation/ops-checkout-gating.ts` blocks the `lawyer` kind with HTTP 423
  ("Attorney marketplace monetization is not enabled.") until the flag is true.
  The route and UI must stay in lockstep with this single predicate.
- **Tests already assert the gate** — `lib/__tests__/release-readiness.test.ts`
  and `lib/__tests__/ops-checkout-gating.test.ts` cover both the green and
  blocked paths; they clear the env between cases.
- **Migrations** are additive; latest is `0067_matter_activity.sql`, so the
  **next free number is `0068`** (only if a future audit-trail slice needs one —
  see below; the activation itself needs no schema change).

## Sub-task checklist

Counsel / compliance gate (blocks everything below):
- [ ] [H/counsel] Approve the Québec attorney advertising + referral-fee /
      fee-splitting ethics memo (Code of Professional Conduct of Lawyers,
      Barreau du Québec) for the `professional_saas_subscription` fee model;
      extend to CA/NY/NJ/CT/US-federal per `launchJurisdictionsRequiringMemo`.
- [ ] [H/counsel] Confirm no `blockedFeeModels` value is in use for the
      attorney lane (must remain subscription, not percentage/success/per-lead).
- [ ] [H/counsel] Sign off the UPL / no-attorney-client-relationship +
      advertising/ranking-disclosure copy shown in the funnel.

Activation (only after the gate above is signed):
- [ ] [H/ops] Set `ATTORNEY_ETHICS_MEMO_APPROVED=1` in production env.
- [ ] [H/ops] Set `ATTORNEY_MARKETPLACE_MONETIZATION_LIVE=1` in production env.
- [ ] [A] Verify trust panel reports `attorneyMarketplaceMonetization: true`
      and a `lawyer` checkout no longer returns HTTP 423 in a staging smoke test.

Optional hardening (engineering, can land ahead of activation, in `juge.ca`):
- [ ] [A] Add an activation audit record (who/when/which jurisdictions) so the
      flip is attributable. If persisted, use additive migration `0068_*.sql`.
- [ ] [A] Surface the policy `status`/`currentFeeModel` in the status panel copy
      so the "why blocked" reason is self-explanatory to operators.

## Human / architecture / counsel decisions required

1. **Counsel (blocking):** Is the `professional_saas_subscription` model clearable
   under Québec attorney-advertising and referral-fee/fee-splitting rules, and in
   each launch jurisdiction? This is the gate; no engineering action substitutes.
2. **Compliance/ops (blocking):** Who is the accountable owner authorized to set
   the two production flags, and what evidence (signed memo reference) is attached?
3. **Architecture:** Should the activation be auditable (recommended) — i.e. add
   the `0068` audit record — or is the env-flag flip sufficient for v1?

## First safe slice (zero-risk, no flag flipped)

Land in `juge.ca` (NOT here): add a single test/assertion that documents and locks
the **double-gate contract** — that `attorneyMarketplaceMonetization` stays
`false` when only ONE of the two flags is set (memo-only, or live-only) and turns
`true` only when BOTH are set. This makes the compliance intent executable and
prevents a future single-flag regression from silently monetizing the attorney
lane. It changes no behavior and flips no flag.

## Next action

Re-run this workflow against `PresidentAnderson/juge.ca` to land the first slice,
then route the counsel/ops checklist above to the accountable humans. The
production flag flips remain a human/counsel action by design and by the autonomy
HARD RULES.
