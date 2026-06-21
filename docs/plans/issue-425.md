# Plan — Issue #425: EFSP submission status pipeline (polling + webhooks)

Child of #412 ([epic] Court filing — live EFSP adapter, replacing the 501 in
`/api/filing/submit`).

## Repository mismatch (must read first)

This issue describes **court e-filing (EFSP) submission status** flowing back
into a **matter / workspace** — webhook handler, status polling fallback +
reconciliation, and surfacing rejection reasons in the workspace UI.

That domain lives in the **`juge.ca`** Next.js application, **not** in this
`annoncedenounce.com` repository. This repo is a static launch site
(`index.html`, `privacy.html`, a single `api/version.js` Vercel probe). It has
no `app/`, no Supabase tables, no `lib/filing/`, and no filing/matter concept.
`docs/OPERATING_CANON.md` here even lists `juge.ca` only as a *reference*
implementation, confirming they are distinct codebases.

The autonomy worktree for #425 was pointed at `annoncedenounce.com` while the
issue belongs to `juge.ca` (the `node_modules` symlink in this worktree already
points at `juge.ca`, reinforcing the mismatch). Implementing the feature here
would mean inventing a whole Next.js filing app that does not belong in a static
site — a direct violation of "smallest correct change / touch only relevant
files / match surrounding code."

**Decision required (human/orchestration):** re-run #425 against a `juge.ca`
worktree. This document is the safe deliverable so the issue still has a PR; the
real change must land in `juge.ca`.

## Current state in `juge.ca` (verified by reading the code)

The submit/webhook surface already partially exists:

- `lib/filing/efsp.ts` — `EfspAdapter` interface (`buildEnvelope`, `submit`,
  `status`), `MockEfspAdapter`, the `FilingStatus` union
  (`draft | submitted | accepted | rejected | filed`), `FilingStatusEvent`, and
  `applyFilingStatusEvent` (last-write-wins reconciliation helper).
- `lib/filing/webhook.ts` — `parseFilingWebhookPayload`,
  HMAC-SHA256 `filingWebhookSignature` / `verifyFilingWebhookSignature`
  (timing-safe), and `webhookPayloadToEvent`.
- `app/api/filing/webhook/route.ts` — **the webhook handler already exists**:
  verifies the `x-efsp-signature` HMAC against `EFSP_WEBHOOK_SECRET`, looks up
  the `court_filings` row by `(efsp_provider, envelope_id)` when `matterId` /
  `courtFilingId` are absent, upserts into `filing_status_events`
  (`onConflict: efsp_provider,envelope_id,status`), and patches
  `court_filings.status` / `reviewer_note` / `filed_at`.
- `app/api/filing/submit/route.ts` — gated submit; uses `MockEfspAdapter` and
  returns 501 only when `legalSuiteReadiness().readyForLiveFiling` is true and
  no live adapter exists.

So sub-task [A] "Webhook handler (accepted/rejected/served) → update the matter"
is **largely done**. The remaining #425 work is **polling fallback +
reconciliation** and **surfacing status/rejection reasons in the workspace**.

## Scope of #425

In scope:
- [A] Webhook handler → update the matter — *exists; verify + harden.*
- [A] Status polling fallback + reconciliation — *new.*
- [A] Surface status + rejection reasons in the workspace — *new.*

Acceptance: a **sandbox** submission's status changes flow back into the matter.

Out of scope (other #412 children): provider envelope mapping, document upload
validation, the live provider adapter itself, prod credential flips.

## Sub-task checklist (to execute in `juge.ca`)

1. **Verify/harden the existing webhook path**
   - Confirm `rejected` carries `note` into `court_filings.reviewer_note` and
     that the status enum maps cleanly to the workspace ("served" → `filed`).
   - Add a rejection-reason column/usage if `reviewer_note` is insufficient
     (e.g. structured `rejection_code`). Additive migration only.
   - Ensure idempotency: the `filing_status_events` upsert key already dedupes
     identical `(provider, envelope, status)`; confirm ordering uses
     `applyFilingStatusEvent` / `received_at` so a late out-of-order webhook
     cannot regress a terminal status.

2. **Polling fallback + reconciliation (new)**
   - Add `app/api/filing/reconcile/route.ts` (or a cron entry) that selects
     non-terminal `court_filings` (status in `submitted | accepted`) older than
     a threshold, calls `adapter.status(envelopeId)` per row, and feeds the
     result through the **same** `webhookPayloadToEvent` →
     `filing_status_events` upsert → `court_filings` patch path used by the
     webhook (extract that write into a shared `lib/filing/apply-status.ts` to
     avoid duplication / drift).
   - Guard the route: cron secret / service-role only; bounded batch size;
     backoff; never poll terminal (`filed | rejected`) filings.
   - Schedule via `vercel.json` cron (juge.ca) or the existing job runner.

3. **Surface status + rejection reasons in the workspace (new)**
   - Read `court_filings.status` + `reviewer_note` (and any `rejection_code`)
     into the matter/workspace view; render a status badge and, for `rejected`,
     the reason; show a timeline from `filing_status_events`.
   - i18n: add the new status/rejection strings to all locale files; run
     `npm run check:locales`.

4. **Tests (sandbox)**
   - Unit: reconciler selection + terminal-status guard; shared apply-status
     helper; out-of-order event handling.
   - Integration (sandbox / mock adapter): happy path (`submitted → accepted →
     filed`) and rejection (`submitted → rejected` with reason surfaced).

## Decisions required (human / architecture / counsel)

- **Orchestration:** re-target #425 to a `juge.ca` worktree (blocker).
- **Provider polling contract (#412 [H]):** which provider(s) and how
  `status(envelopeId)` maps to the `FilingStatus` enum; sandbox credentials.
- **Polling cadence & cost:** interval, batch size, max attempts before
  human escalation.
- **Counsel/compliance:** what rejection detail may be surfaced to which roles;
  audit-log/provenance requirements for every status transition (#412 ties
  status into the audit log). Do not flip the `readyForLiveFiling` gate.

## First safe slice (in `juge.ca`)

Extract the webhook's "apply status event → `filing_status_events` +
`court_filings`" write into a single pure-ish helper
`lib/filing/apply-status.ts`, refactor `app/api/filing/webhook/route.ts` to call
it (no behavior change), and add unit tests for terminal-status protection and
out-of-order events. This is fully additive, agent-doable, unblocks the polling
reconciler (which reuses the same helper), and needs no credentials or gate
flips.
