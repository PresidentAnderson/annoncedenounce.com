# Plan — Issue #413: Marketplace monetization (fee/referral model + payout operations)

Status: PLAN (epic / human-gated). This document is the deliverable. It does **not**
build the feature and does **not** flip any monetization, compliance, or payout flag.

## Repo placement note (read first)

Issue #413 is an **epic** in `PresidentAnderson/juge.ca` (the legal-services
application). This worktree is the **`annoncedenounce.com` static launch site**
(HTML + Vercel; no database, no payments backend, no feature-flag layer, no
migrations). `docs/OPERATING_CANON.md` lists `juge.ca` only as a *reference
implementation pattern* for this site.

The marketplace monetization and payout machinery therefore cannot be built here,
and the "stay in YOUR worktree only" rule forbids editing `juge.ca` from this
worktree. Per the autonomy fallback, this PR carries the epic plan so #413 has a
tracked PR and the work is routed correctly. All child issues (#443–#449) follow
the same routing — see their plans under `docs/plans/issue-44*.md`.

## Scope (what "done" means for the epic)

The `ATTORNEY_MARKETPLACE_MONETIZATION_LIVE` flag and provider payouts go live only
after a **counsel-approved** commercial + tax posture. Acceptance from the issue:

1. Counsel-approved fee/referral model **encoded** in marketplace config (edition-aware).
2. Reconciliation **balances in test mode** (charges ↔ payouts ↔ refunds).
3. Payout runbook **signed** (dispute / chargeback / clawback handling).
4. Monetization + payout flags **flip cleanly** in production.

CTO direction (2026-06-19, recorded on the issue): development and decomposition
proceed **ahead of** counsel review. Counsel approval is a **gate before COMMERCIAL
ACTIVATION** (flipping the live flag), not a blocker to building.

## Current state (verified read-only in `juge.ca`)

- **Gate flag** — `attorneyMarketplaceMonetizationEnabled()` in
  `lib/legal/attorney-marketplace-policy.ts` requires **both**
  `ATTORNEY_ETHICS_MEMO_APPROVED` and `ATTORNEY_MARKETPLACE_MONETIZATION_LIVE`.
- **Compliance guardrail** — `ATTORNEY_MARKETPLACE_POLICY`
  (`status: "blocked_pending_counsel"`, `currentFeeModel:
  "professional_saas_subscription"`) enumerates `blockedFeeModels`
  (`percentage_of_legal_fee`, `success_fee`, `unapproved_per_lead`,
  `unapproved_per_matter`) and `launchJurisdictionsRequiringMemo`
  (QC, CA, NY, NJ, CT, US-federal).
- **Payout machinery exists** — `lib/payouts/`: `stripe-connect.ts`, `eft-ca.ts`,
  `disburse.ts`, `escrow.ts`, `ledger.ts`, `refunds.ts`, `tax-export.ts`,
  `webhook.ts`, `types.ts`, `index.ts`. Gated by `PROVIDER_PAYOUTS_LIVE`;
  `isTestMode()` honored.
- **Referrals exist** — `lib/growth/referrals.ts` (+ `app/api/referrals/*`).
- **Migrations** are additive; latest is `0067_matter_activity.sql`, so the
  **next free number is `0068`**.

## Child decomposition (already fanned out)

The epic is delivered through its children; this plan is the coordinating index.

| Child | Subject | Lane |
|-------|---------|------|
| #443  | Fee/referral engine (edition-aware, draft/flag-off model) | [A] |
| #444  | Surface fees transparently in funnel/checkout (ties #383/#384) | [A] |
| #445  | Reconciliation ledger + daily reconciliation job | [A] |
| #446  | Payout execution + Stripe Connect transfer webhook | [A] |
| #447  | (completed) | [A] |
| #448  | Year-end 1099 export / reporting data | [A] |
| #449  | Tax/1099 posture sign-off + payout runbook (pre-activation gate) | [H] |

## Epic sub-task checklist

Fee / referral model (gates `ATTORNEY_MARKETPLACE_MONETIZATION_LIVE=1`):
- [ ] [H/counsel] Approve attorney fee/referral model vs UPL + bar
      advertising/referral-fee rules, per jurisdiction (#449 captures the gate).
- [ ] [A] Encode the approved fee schedule + referral logic, edition-aware (#443).
- [ ] [A] Surface fees transparently in funnel/checkout (#444, ties #383/#384).

Provider payouts (#59):
- [ ] [H] Tax/1099 posture — US 1099-K/NEC, CA T4A — counsel/accounting sign-off (#449).
- [ ] [A] Reconciliation ledger of charges ↔ payouts ↔ refunds + daily job (#445).
- [ ] [A] Payout scheduling + Stripe Connect transfers (edition-aware;
      `isTestMode()` honored) (#446).
- [ ] [A] Year-end 1099 export / reporting data (#448).
- [ ] [H] Payout runbook approval — dispute / chargeback / clawback (#449).
- [ ] [H] Flip monetization + payout flags in production (final gate).

## Human / counsel / architecture decisions required (blocking activation)

1. **[H/counsel] Fee model legality** — which fee model is approved per launch
   jurisdiction; none of the `blockedFeeModels` may become representable in config.
2. **[H/counsel] Referral-fee + advertising rules** — bar rules on lawyer-referral
   services, fee splitting with non-lawyers, ranking/advertising disclosures.
3. **[H/accounting] Tax/information-reporting posture** — US 1099-K / 1099-NEC,
   CA T4A; who is payor of record per edition.
4. **[H/ops] Payout runbook** — dispute / chargeback / clawback handling, signed.
5. **[architecture] Reconciliation source of truth** — PSP ledger vs internal
   ledger; tolerance + alerting for the daily job (#445).
6. **[architecture] Webhook routing** — register Stripe `transfer.*` events;
   endpoint per edition (#446).
7. **[H] Flag-flip authority + order** — `ATTORNEY_ETHICS_MEMO_APPROVED`, then
   `ATTORNEY_MARKETPLACE_MONETIZATION_LIVE`, then `PROVIDER_PAYOUTS_LIVE`.

## First safe slice

The epic itself ships no code; the first executable slice is its leading child:

- **#443 — fee/referral engine, draft (flag-off) model.** A pure, config-as-code
  fee calculator + unit tests in `juge.ca`. The flag stays **off**; no charging,
  no payouts, and **no `blockedFeeModels` value representable** in the config type.
  Reconciliation (#445) and payout execution (#446) follow as independent safe
  slices, each inert behind its flag until a human flips it.

If a migration is needed by any child, it must be **additive-only** at the next
free number (`0068`), never a backfill/rewrite.

## Hard rules honored

- No edit to `lib/version.ts`.
- No monetization / compliance / payout flag or attestation flipped.
- Migrations called out as additive-only at the next free number (`0068`).
- Doc-only change in this repo (the static landing site); no app behavior touched.
