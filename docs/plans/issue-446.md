# Issue #446 — [payouts] Payout execution + webhook (Stripe Connect)

Child of #413 (epic: Marketplace monetization). Refs #446.

## IMPORTANT: repository mismatch (why this is a plan, not an implementation)

Issue **#446 lives in the `PresidentAnderson/juge.ca` repository**, where all the
payout / Stripe Connect code resides (`lib/payouts/**`, `app/api/payouts/**`).

This worktree is a checkout of **`PresidentAnderson/annoncedenounce.com`** — a
static launch site (HTML + Vercel, no TypeScript app, no Stripe, no Supabase).
The assigned worktree therefore contains none of the code #446 touches, and the
hard rule "stay in YOUR worktree only" forbids editing `juge.ca` from here.

Per the workflow fallback ("If genuinely blocked on a real implementation,
STILL open a PR carrying a plan doc so the issue has a PR"), this document is the
deliverable. It is written against the **actual juge.ca code** (read-only review)
so a follow-up agent running inside a `juge.ca` worktree can land it directly.

## Scope (from the issue)

> Part of #413. Payout execution. [A] (depends on Connect onboarding in #422)
> - [ ] [A] Payout scheduling + Stripe Connect transfers (edition-aware accounts; `isTestMode()` honored)
> - [ ] [A] Payout webhook handler (paid/failed) feeding reconciliation
>
> Acceptance: a test-mode payout executes and reconciles.

## Current state in juge.ca (already implemented)

- `lib/payouts/disburse.ts` — `disburseEscrow()`: escrow-gated release with a
  deterministic idempotency key (`payout-release:<id>:<updated_at>`), provider
  abstraction, and persistence of `status="paid"` + escrow transition.
- `lib/payouts/stripe-connect.ts` — `createStripeConnectProvider().disburse()`:
  edition-aware (`edition: "us"`, `rail: "stripe_transfer"`), creates
  `stripe.transfers.create({ destination: connectAccountId }, { idempotencyKey })`,
  gates on `PROVIDER_PAYOUTS_LIVE` and on the payee account being `verified`.
  `isStripeConnectConfigured()` requires `STRIPE_SECRET_KEY` +
  `STRIPE_CONNECT_WEBHOOK_SECRET`.
- `app/api/payouts/webhook/route.ts` — verifies the Stripe signature against
  `STRIPE_PAYOUTS_WEBHOOK_SECRET` and handles **refund / dispute** lifecycle
  (`charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`) feeding
  the escrow reconciliation helpers in `lib/payouts/refunds.ts`.
- `lib/service/stripe.ts` — `isTestMode()` already exists and is honored by the
  service layer.
- `lib/payouts/types.ts` — `PayoutStatus` already includes
  `processing | paid | returned | reversed`, so the transfer lifecycle maps onto
  existing statuses **with no schema migration**.

## The concrete remaining gap

The transfer-execution path writes `status="paid"` optimistically as soon as
`stripe.transfers.create` returns, but the webhook does **not** handle the
Stripe **`transfer.*` lifecycle events** that confirm or reverse a payout. A
`grep` for `transfer.paid|transfer.failed|transfer.reversed|transfer.updated`
returns nothing across `lib/` and `app/`.

So the unfinished half of the issue — "Payout webhook handler (paid/failed)
feeding reconciliation" — is: **handle transfer lifecycle events and reconcile
the `payouts` row to the real Stripe outcome.**

## Sub-task checklist (for the juge.ca implementer)

1. **Pure helper — `lib/payouts/transfer-events.ts`** (no I/O, fully unit-testable):
   - `transferEventToPayoutUpdate(event)` mapping
     `Stripe.Event` → `{ status: PayoutStatus; external_ref?; updated_at } | null`:
     - `transfer.created` → `processing` (only if current status is not already
       a terminal `paid`/`reversed`; never downgrade `paid`)
     - `transfer.paid` (or `transfer.updated` with destination payout confirmed)
       → `paid`
     - `transfer.reversed` → `reversed` (and surface reversed amount for the
       reconciliation ledger)
     - `transfer.failed` (legacy `payout.failed` on the connected account, routed
       via a Connect webhook) → `returned`
   - Use the existing `stripeCreatedIso(event.created)` for `updated_at`.
   - Resolve the `payouts` row by `external_ref = transfer.id` first, then fall
     back to `transfer.metadata.payoutId` (the `disburse` path already stamps
     `metadata.payoutId`).
2. **Wire into the webhook route** `app/api/payouts/webhook/route.ts`:
   - Add `transfer.created | transfer.paid | transfer.updated | transfer.reversed`
     branches that load the payout (reuse a `findPayoutByTransfer` lookup mirroring
     `findPayoutForCharge`) and `persistEscrowUpdate` the mapped update.
   - Keep the existing signature verification, idempotent updates, and the
     swallow-and-log error posture (return `{ received: true }`).
   - Idempotency: guard against out-of-order delivery by never overwriting a
     terminal status with an earlier-stage one (compare `updated_at`).
3. **Edition-aware transfer events**: the US edition emits `transfer.*` on the
   platform account; the CA `eft_ca` rail is out of scope here (separate child).
   Branch on `event.account`/metadata `edition` only if needed; default to US.
4. **`isTestMode()` honored**: the webhook is mode-agnostic (Stripe sends test
   events to the test secret). Add an assertion in the disburse path that, when
   `isTestMode()`, transfers still execute against the test key so the acceptance
   ("a test-mode payout executes and reconciles") is verifiable end-to-end.
5. **Reconciliation feed**: have the transfer handler update the same
   `payouts` columns the daily reconciliation job reads (`status`,
   `external_ref`, `updated_at`, and a new nullable `reversed_amount_cents` only
   if needed — additive migration with the next free number, NOT in this slice).
6. **Tests** (`lib/payouts/__tests__/transfer-events.test.ts`, `node:test`,
   mirroring `webhook.test.ts`):
   - `transfer.paid` → `{ status: "paid" }`
   - `transfer.reversed` → `{ status: "reversed" }`
   - `transfer.failed`/`payout.failed` → `{ status: "returned" }`
   - never downgrades `paid` → `processing` on a late `transfer.created`
   - malformed/unknown event → `null` (no-op)

## First safe slice (smallest correct change)

Ship steps **1 + 6** only: the pure `transfer-events.ts` mapper plus its unit
tests. It is side-effect-free, adds full coverage of the paid/failed/reversed
mapping, requires **no migration and no env/flag changes**, and does not touch
the live webhook wiring — so it cannot affect production payout behavior. Wiring
it into the route (step 2) is the immediate follow-up PR once the mapper is
reviewed.

## Human / architecture / counsel decisions required (do NOT self-approve)

- **#413 gate**: `ATTORNEY_MARKETPLACE_MONETIZATION_LIVE` and
  `PROVIDER_PAYOUTS_LIVE` must stay OFF until counsel + accounting sign-off
  (UPL / bar referral-fee rules; US 1099-K/NEC, CA T4A posture). This issue must
  **not** flip any monetization/compliance flag — code only.
- **Payout runbook** (dispute / chargeback / clawback) approval is a human gate
  in #413; the transfer-reversal handling here must conform to that runbook once
  signed.
- **Connect webhook vs. platform webhook**: decide whether `payout.failed` on the
  connected account is routed via the existing `app/api/connect/webhook/route.ts`
  or the payouts webhook — an architecture call affecting which signing secret
  validates the event.

## Acceptance verification (test mode)

1. Configure `STRIPE_SECRET_KEY` (test), `STRIPE_PAYOUTS_WEBHOOK_SECRET`,
   `STRIPE_CONNECT_WEBHOOK_SECRET`; leave `PROVIDER_PAYOUTS_LIVE` unset for the
   gated path or set per the runbook for the test transfer.
2. Onboard a test Express account to `verified` (#422), accrue a payout, call
   `disburse` → a test-mode `transfer` is created with the idempotency key.
3. Stripe CLI: `stripe trigger transfer.paid` (and `transfer.reversed`) → webhook
   reconciles the `payouts` row to `paid` / `reversed`.
4. Confirm `node_modules/.bin/tsc --noEmit` adds no new errors and the new
   `node:test` suite passes.
