# Plan — Issue #422: Go-live Stripe Connect / EFT payouts

> **Mode: PLAN (epic, human-gated).** This document is the deliverable. It does
> **not** build the feature. It scopes the go-live, lists a concrete sub-task
> checklist, names the human / architecture / counsel decisions that must land
> first, and defines the first safe slice an agent can ship.

- **Issue:** [ops] Go-live: Stripe Connect / EFT payouts — child of **#411**
- **Related:** config-flag tracker **#59** · monetization epic **#413**
- **Labels:** `area:payments`, `compliance`, `human-gate`, `ops`, `priority:high`
- **Code lives in:** `PresidentAnderson/juge.ca` (this PR lands the plan doc in the
  `annoncedenounce.com` repo, where this worktree is checked out; the
  implementation work itself happens in `juge.ca`).

## Acceptance (from the issue)

A provider onboards via Connect and receives a **test-mode** payout; webhooks
reconcile; the `PROVIDER_PAYOUTS_LIVE` flag flips cleanly.

## Hard rules carried into every sub-task

- **Never** edit `lib/version.ts`.
- **Never** flip monetization / compliance gate flags or attestations from code
  (`PROVIDER_PAYOUTS_LIVE`, `CA_EFT_COMPLIANCE_APPROVED`,
  `ATTORNEY_*`, etc.). These are env-driven and human-gated by design — see
  `lib/trust/release-readiness.ts` and `lib/payouts/index.ts`.
- Migrations are **additive-only** with the next free number. Current highest is
  `supabase/migrations/0067_matter_activity.sql`, so the next free number is
  **`0068_*`**.
- Touch only files relevant to payouts.

---

## Current state (what already exists in juge.ca — verified)

The payout rails are already substantially built. Go-live is mostly wiring +
verification + human gates, not green-field construction.

| Area | Status | Location |
| --- | --- | --- |
| Server Stripe client + `isTestMode()` (`sk_test_`) | done | `lib/service/stripe.ts` |
| Edition resolver (`qc`/`ca`/`us`) | done | `lib/edition.ts`, `lib/editions.ts` |
| Edition-aware provider selection (US→Stripe Connect, QC/CA→EFT) | done | `lib/payouts/index.ts` `getPayoutProvider()` |
| Express-account creation + hosted onboarding link | done | `lib/payouts/stripe-connect.ts` `onboardProvider()` |
| Onboarding API (GET status / POST start) | done | `app/api/payouts/onboard/route.ts` |
| Connect webhook: `account.updated` → status sync + remediation email; `account.application.deauthorized` → reset | done | `app/api/connect/webhook/route.ts` (`STRIPE_CONNECT_WEBHOOK_SECRET`) |
| KYC status mapping (`pending`/`verified`/`restricted`) | done | `lib/payouts/stripe-connect.ts` `payoutStatusFromAccount()` |
| Destination-charge engage flow, gated on `trustReadinessServices().providerPayouts` | done | `app/api/marketplace/engage/route.ts` |
| Transfer disbursement + escrow/ledger | done | `lib/payouts/{disburse,escrow,ledger}.ts` |
| Payouts webhook: `charge.refunded`, `charge.dispute.created/closed` | done | `app/api/payouts/webhook/route.ts` (`STRIPE_PAYOUTS_WEBHOOK_SECRET`) |
| Readiness gate / blocker reporting | done | `lib/payouts/index.ts` `payoutRailReadiness()`, `lib/trust/release-readiness.ts` |
| Tax export scaffolding (1099 basis) | partial | `lib/payouts/tax-export.ts` |
| CA EFT rail (encrypted bank details, batch export) | done | `lib/payouts/eft-ca.ts` |

### Confirmed gaps (the actual go-live work)

1. **`payout.paid` / `payout.failed` are NOT handled anywhere.** A repo-wide grep
   for `payout.paid` / `payout.failed` / `payout.updated` returns nothing. The
   issue explicitly requires a "payout webhook handler (paid/failed)". The
   existing payouts webhook only covers refunds and disputes.
2. **`reconcile()` is a stub.** `createStripeConnectProvider().reconcile()`
   returns `{ checked: 0, updated: 0 }` — no reconciliation hook against Stripe
   (see #413). The CA EFT provider needs the equivalent.
3. **No end-to-end test-mode smoke test** for the onboard → engage → transfer →
   payout-webhook → reconcile loop.
4. **No post-flip payout-failure monitoring** surface/alert.

---

## Scope

**In scope (agent-buildable, behind the existing OFF gate):**
- Add `payout.paid` / `payout.failed` handling to the payouts webhook, persisting
  payout lifecycle state without flipping any gate.
- Implement a real `reconcile()` for the Stripe Connect provider (and the EFT
  equivalent) that compares Stripe payout state to our ledger and reports drift —
  read-only/idempotent, safe to run with the flag OFF.
- Additive migration `0068_*` if a new column/table is needed to record payout
  lifecycle (e.g. `payout_events` audit rows or `payouts.payout_state`).
- Test-mode end-to-end smoke test (uses `isTestMode()`, no live keys).
- Post-flip monitoring hook (count/alert on `payout.failed`).
- Confirm edition-aware account selection + `isTestMode()` are honored on every
  new path.

**Out of scope (human / counsel / ops only — do NOT attempt in code):**
- Stripe Connect platform + connected-account onboarding configuration per
  edition (qc/ca/us) and payout-schedule config in the Stripe dashboard.
- Setting the production env secrets (`STRIPE_SECRET_KEY`,
  `STRIPE_CONNECT_CLIENT_ID`, `STRIPE_CONNECT_WEBHOOK_SECRET`,
  `STRIPE_PAYOUTS_WEBHOOK_SECRET`) in the deploy environment.
- Tax / 1099 sign-off and the go-live runbook approval (#413).
- Flipping `PROVIDER_PAYOUTS_LIVE=1` (and `CA_EFT_COMPLIANCE_APPROVED` for CA).

---

## Sub-task checklist

> Tags: **[A]** = agent-buildable · **[H]** = human / counsel / ops gate.

- [ ] **[H]** Stripe Connect onboarding configured (platform + connected-account
      flow) per edition; payout-schedule config in the Stripe dashboard.
- [ ] **[A]** Confirm/set env wiring for `STRIPE_CONNECT_CLIENT_ID`,
      `STRIPE_CONNECT_WEBHOOK_SECRET`, `STRIPE_PAYOUTS_WEBHOOK_SECRET`; verify
      edition-aware account selection (`getPayoutProvider`) and `isTestMode()`
      are honored. (Set values is **[H]**; the verification + any missing
      readiness blocker reporting is **[A]**.)
- [ ] **[A]** Connected-account onboarding-link flow for providers + KYC status
      surfacing — already present (`onboard` route + `account.updated`); audit
      for edition coverage and add tests / any missing UI surfacing.
- [ ] **[A]** Payout transfers + **payout webhook handler (paid/failed)** +
      reconciliation hook (see #413). *This is the primary missing code.*
- [ ] **[A]** Test-mode payout smoke test, end-to-end.
- [ ] **[H]** Tax / 1099 + runbook approval (#413); flip `PROVIDER_PAYOUTS_LIVE=1`.
- [ ] **[A]** Post-flip monitoring (payout failures): alert/metric on
      `payout.failed`.

---

## Human / architecture / counsel decisions required (blockers)

1. **Connect product config (ops/Stripe).** Express vs. Standard accounts per
   edition, capability set, payout schedule, and statement descriptors. Code
   currently creates **Express** US accounts (`country: "US"`,
   `capabilities.transfers`). QC/CA use the EFT rail, not Connect — confirm that
   the "ca" edition is EFT (current code) and not a Connect account, since the
   issue title says "Stripe Connect / EFT".
2. **Webhook endpoints (ops).** Register two distinct endpoints with two distinct
   signing secrets in the Stripe dashboard: a **Connect** endpoint →
   `/api/connect/webhook` (`STRIPE_CONNECT_WEBHOOK_SECRET`) and a **payments**
   endpoint → `/api/payouts/webhook` (`STRIPE_PAYOUTS_WEBHOOK_SECRET`). Decide
   which `payout.*` events route to which endpoint (payout events fire on the
   connected account, so they arrive via the Connect endpoint with the `account`
   field set — architecture decision needed before wiring task 4).
3. **Tax / 1099 posture (counsel + finance, #413).** Reportable basis, thresholds
   (`DEFAULT_TAX_THRESHOLDS_CENTS`), W-9/W-8 collection, and whether the platform
   files 1099-K/NEC or relies on Stripe's 1099 service. Gates the flag flip.
4. **CA EFT compliance attestation (counsel).** `CA_EFT_COMPLIANCE_APPROVED` must
   be a human attestation, never code-set. Confirm encryption-at-rest
   (`ENCRYPTION_KEY`) and the chosen rail (`EFT_PROVIDER_API_KEY` vs.
   `EFT_BATCH_EXPORT_ENABLED`).
5. **Reconciliation source of truth (#413).** Decide whether our ledger or Stripe
   is authoritative on drift, and what an operator does when they disagree
   (manual review queue vs. auto-correct). Needed before reconcile is more than
   read-only reporting.
6. **Go-live runbook + flag flip (ops, #59/#413).** Order of operations,
   rollback, and who flips `PROVIDER_PAYOUTS_LIVE=1`.

---

## First safe slice (agent, mergeable behind the OFF gate)

The smallest correct, production-quality change that advances go-live without
touching any gate and without going live:

**Add `payout.paid` / `payout.failed` handling to the payouts webhook +
persistence, plus a unit test — all inert while `PROVIDER_PAYOUTS_LIVE` is off.**

1. Extend `app/api/payouts/webhook/route.ts` with `payout.paid` and
   `payout.failed` branches that record the payout's terminal state. Follow the
   existing handler shape (signature-verified, `try/catch` + `console.error`,
   `{ received: true }`), and reuse `stripeCreatedIso()` from
   `lib/payouts/webhook.ts`.
2. If a column is required to store lifecycle state, add additive migration
   **`supabase/migrations/0068_payout_lifecycle.sql`** (e.g. a nullable
   `payout_state` column or a `payout_events` audit table) — additive-only, next
   free number. Prefer recording to an audit table so nothing existing changes.
3. Add a pure helper for the paid/failed → row-update mapping (mirrors
   `payoutStatusFromAccount()`'s pure/testable style) so it can be unit-tested
   without Stripe.
4. Add a unit test under `lib/payouts/__tests__/` for that helper and a
   webhook-routing test using a constructed event (no live keys; honors
   `isTestMode()`).
5. **Do not** flip any flag, edit `lib/version.ts`, or alter
   `lib/trust/release-readiness.ts` gate logic. The new branches are reached only
   when Stripe sends events to a configured endpoint, which is itself gated by
   ops registering the webhook + setting the secret.

**Why this slice first:** it closes the single most concrete confirmed gap (the
issue explicitly names "payout webhook handler (paid/failed)"), is fully
testable in test mode, carries zero go-live risk because it is inert until ops
register the webhook and a human flips the flag, and it unblocks the reconcile
hook (task 4) and the end-to-end smoke test (task 5).

### Definition of done for the first slice
- `tsc --noEmit` adds no new errors in touched files.
- New unit test(s) pass.
- No gate flag, attestation, or `lib/version.ts` change.
- Migration (if any) is additive and numbered `0068_*`.
- PR references #422 and notes the remaining **[H]** gates are unblocked but not
  performed.
