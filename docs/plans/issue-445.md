# Plan — Issue #445: [payouts] Reconciliation ledger + daily job (child of #413)

Refs #445. Refs #413.

## Status: BLOCKED in this repository — wrong codebase

Issue #445 describes a **payments reconciliation ledger** (linking charges ↔ payouts ↔
refunds) plus a **daily reconciliation job with a discrepancy report**. Acceptance is
"ledger balances in test mode; discrepancies flagged."

The workflow placed this task in the **`annoncedenounce.com`** repository, which is a
**static marketing / launch site**. It contains:

- static HTML (`index.html`, `privacy.html`), `sitemap.xml`, `robots.txt`, `site.webmanifest`
- a single read-only serverless endpoint `api/version.js` (returns build/release metadata)
- build/verify scripts (`scripts/bump-version.mjs`, `scripts/verify-site.mjs`)

There is **no payments infrastructure** here at all: no database, no migrations, no Stripe
(or other PSP) integration, no charges/payouts/refunds domain, and no cron/job runner. The
only "payment" string in the repo is the `payment=()` Permissions-Policy in `vercel.json`,
which *disables* the browser Payment Request API.

`docs/OPERATING_CANON.md` confirms the intent: this repo "follows the same operating shape
as the stronger AXAI/sovereign repos, scaled down for a static launch site" and lists
`juge.ca` only as a **reference implementation pattern**, not as the same codebase. Issue
#445 itself lives in the **`PresidentAnderson/juge.ca`** repository (verified via
`gh issue view 445 --repo PresidentAnderson/juge.ca`), where the payments epic #413 and the
charges/payouts domain actually exist.

Implementing a reconciliation ledger + daily job here would mean inventing an entire
payments subsystem in a static website. That code would never run, would contradict the
repo's stated purpose, and would violate the hard rule "touch only files relevant to this
issue." This plan documents the correct path instead.

## Scope (of the real feature, in the correct repo)

1. **Reconciliation ledger** — a durable, append-only record linking each charge to its
   resulting payout(s) and any refunds, so every settled cent is traceable end to end.
2. **Daily reconciliation job** — a scheduled job that, for the prior period, recomputes
   expected balances from PSP events and the ledger, then emits a discrepancy report.
3. **Acceptance**: in test mode the ledger balances (sum of charges − refunds − fees =
   net payouts within tolerance); any mismatch is flagged in the report.

## Sub-task checklist (to be done in `juge.ca`, gated on the decisions below)

- [ ] [A] Confirm target repo/branch and the existing payments schema in `juge.ca`
      (charges, payouts, refunds, fees tables / PSP event store).
- [ ] [A] Additive-only migration: create `reconciliation_ledger` table with the **next
      free migration number**. Columns (indicative): `id`, `charge_id`, `payout_id`,
      `refund_id` (nullable), `entry_type` (charge|fee|refund|payout|adjustment),
      `amount_cents`, `currency`, `psp_event_id`, `occurred_at`, `created_at`. Add a
      `reconciliation_runs` table: `id`, `period_start`, `period_end`, `status`,
      `expected_net_cents`, `actual_net_cents`, `discrepancy_count`, `report_ref`,
      `created_at`. Indexes on `charge_id`, `payout_id`, `period_*`. No destructive ops.
- [ ] [A] Ledger writer: idempotent (keyed on `psp_event_id`) projection from PSP webhooks
      / event store into ledger entries. Backfill path for historical events.
- [ ] [A] Reconciliation engine: per-period aggregate of ledger vs. PSP balance/payout
      report; compute discrepancies with an explicit rounding/fee tolerance.
- [ ] [A] Discrepancy report: structured output (persisted row + machine-readable artifact)
      listing unmatched/orphaned charges, payouts, refunds, and net mismatch.
- [ ] [A] Daily scheduler wiring (cron) running in **test mode first**; alerting only when
      `discrepancy_count > 0`.
- [ ] [A] Tests: unit tests for the balance math (incl. partial refunds, multi-currency,
      fee handling) and an integration test asserting "balances in test mode."
- [ ] [A] Observability: structured logs + a metric for last-run discrepancy count.

## Decisions required (human / architecture / counsel) — all [A]

1. **Repository placement (blocking).** Confirm #445 should be implemented in
   `PresidentAnderson/juge.ca` (the payments codebase), and re-route this task there. This
   static-site worktree cannot host it.
2. **PSP source of truth.** Which provider's payout/balance report is authoritative
   (e.g. Stripe Balance Transactions / Payout reports) and how fees are represented.
3. **Tolerance & currency policy.** Acceptable rounding/fee tolerance for "balances," and
   whether multi-currency settlements are in scope for the first cut.
4. **Discrepancy handling SLA.** Who is alerted, where the report is delivered, and the
   manual-adjustment workflow (the `adjustment` entry type) — likely needs finance/counsel
   sign-off for any write-backs.
5. **Data retention / compliance.** Retention of ledger + reports and access controls
   (financial records); compliance gate flags must NOT be flipped without approval.

## First safe slice

In `juge.ca` (once placement is confirmed): land the **additive-only migration** for
`reconciliation_ledger` + `reconciliation_runs` (next free migration number) and the
**idempotent ledger writer** behind a flag, with unit tests for the projection — no
scheduler, no alerting, no balance enforcement yet. This is read-only with respect to money
movement and reversible, and unblocks the engine and daily job as follow-ups.

In **this** (`annoncedenounce.com`) repo: no code change is appropriate. This plan doc is
the deliverable so the issue carries a PR and the misrouting is recorded.
