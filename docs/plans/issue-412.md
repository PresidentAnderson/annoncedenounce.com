# Issue #412 — Court filing: live EFSP adapter (epic plan)

> Mode: **PLAN** (epic / human-gated). This document is the deliverable. It is the
> coordinating plan for the epic; the build is fanned out into children
> #423–#427, four of which already have open plan PRs.

## Problem

`app/api/filing/submit/route.ts:36` returns **501** —
`"live EFSP adapter is not implemented for this provider yet"`. The route, the
adapter interface, and the supporting DB schema all exist; the *live* provider
adapter does not. Today every real submission either hits the 501 (when the
readiness gate reports `readyForLiveFiling`) or silently falls through to the
`MockEfspAdapter` (when it does not). Neither path actually files anything with a
court.

## What already exists (do not rebuild)

Grounding the plan in the current code so each slice is additive:

- **Route**: `app/api/filing/submit/route.ts` — auth, payload validation,
  `confirm` human-gate, readiness check, then `MockEfspAdapter.buildEnvelope` →
  `submit`, then writes `efsp_provider` / `envelope_id` / `status` to
  `court_filings`. The 501 is at line 36.
- **Adapter contract**: `lib/filing/efsp.ts` — `EfspAdapter` interface
  (`provider`, `buildEnvelope`, `submit`, `status`), the `FilingEnvelope` /
  `FilingSubmission` / `FilingStatusEvent` types, `FilingStatus` union
  (`draft|submitted|accepted|rejected|filed`), `MockEfspAdapter`, and
  `applyFilingStatusEvent` (last-writer-wins merge by `receivedAt`).
- **Webhook primitives**: `lib/filing/webhook.ts` — `parseFilingWebhookPayload`,
  `filingWebhookSignature` (HMAC-SHA256), `verifyFilingWebhookSignature`
  (timing-safe), `webhookPayloadToEvent`. There is signing/parsing but no
  mounted webhook **route** yet.
- **Schema** (migration `0051_court_filing.sql`): `court_filings` extended with
  `efsp_provider`, `envelope_id`, `reviewer_note`, `data jsonb`;
  `filing_status_events` (with an idempotency unique index on
  `(efsp_provider, envelope_id, status)`); `service_events`. RLS via
  `can_access_matter` / `can_edit_matter`.
- **Readiness gate**: `lib/ops/legal-suite-readiness.ts` — `legalSuiteReadiness()`
  reads `EFSP_LIVE_ENABLED`, `EFSP_PROVIDER`, `EFSP_API_URL`, `EFSP_API_KEY`,
  `EFSP_WEBHOOK_SECRET`. `readyForLiveFiling` is the gate the route branches on.

> **HARD CONSTRAINTS** for every child slice:
> - Never edit `lib/version.ts`.
> - Never flip monetization/compliance gate flags or attestations. The live
>   filing flag (`EFSP_LIVE_ENABLED`) and per-jurisdiction enablement are
>   **human/ops** actions (#427), not code changes in agent PRs.
> - Migrations are **additive-only** with the next free number — currently
>   **0068** (highest in tree is `0067_matter_activity.sql`).

## Scope

In scope (the epic, delivered via children):

1. A **live** `EfspAdapter` implementation that talks to a real EFSP over
   `EFSP_API_URL` + `EFSP_API_KEY` (#423).
2. Faithful **payload → provider-envelope mapping** incl. parties, documents,
   fees, court/location codes, plus per-provider document/format validation
   (#424).
3. **Status pipeline**: polling `adapter.status()` + a mounted, signature-verified
   webhook route writing `filing_status_events` and surfacing into the workspace
   (#425).
4. **Reliability**: structured error taxonomy (replace the bare 501), idempotency
   keys, and an audit trail of every submission (#426).
5. **Provider selection + production go-live**: choose provider(s), wire
   per-jurisdiction routing, sandbox→prod credential management, and the
   human-gated flag flip (#427).

Out of scope:

- Flipping `EFSP_LIVE_ENABLED` or any per-jurisdiction live flag (human/ops).
- Choosing the commercial EFSP vendor and signing contracts (human/counsel).
- Re-architecting `court_filings` / matters; only additive columns/tables.

## Sub-task checklist (epic → children)

- [ ] **#423 [A]** Live `EfspAdapter` (`lib/filing/efsp-live.ts` or similar)
      implementing `buildEnvelope` / `submit` / `status` against the existing
      interface; selected by `EFSP_PROVIDER`. Route picks live vs mock via a
      small factory instead of `new MockEfspAdapter()` directly.
- [ ] **#424 [A]** Payload→envelope mapper (parties, documents, fees,
      court/location codes) + per-provider document/format validation; pure,
      unit-testable functions feeding `buildEnvelope`.
- [ ] **#425 [A]** Status pipeline: polling helper around `adapter.status()` +
      `app/api/filing/webhook/route.ts` using `verifyFilingWebhookSignature` and
      `webhookPayloadToEvent`, persisting to `filing_status_events`
      (idempotent via existing unique index), merged with `applyFilingStatusEvent`.
- [ ] **#426 [A]** Error taxonomy: replace the bare 501 with structured
      `{ ok:false, code, error, retriable }` responses; idempotency key on
      submit (client-supplied or derived) so retries don't double-file;
      append-only audit log of every submission attempt + provenance.
- [ ] **#427 [H]** Provider selection (e.g. Tyler Technologies / InfoTrack — may
      be one per jurisdiction), sandbox + prod credentials, per-jurisdiction
      routing config, and the production flag flip.

## Decisions required before/while building

**Human / credentials (blocking the end-to-end acceptance):**
- Which EFSP provider(s), and whether routing is per-jurisdiction (#427, #412 [H]).
- Sandbox **and** production credentials: `EFSP_PROVIDER`, `EFSP_API_URL`,
  `EFSP_API_KEY`, `EFSP_WEBHOOK_SECRET` provisioned per environment.
- Who owns the `EFSP_LIVE_ENABLED` flip and per-jurisdiction go-live sign-off.

**Architecture:**
- Adapter selection strategy: a `getEfspAdapter(provider)` factory vs. registry;
  how the route chooses live vs. mock without leaking the gate flag into agent code.
- Polling vs. webhook precedence and reconciliation (webhook is authoritative,
  poll is a backstop) — `applyFilingStatusEvent` already encodes last-writer-wins.
- Idempotency key shape and where it is stored (new additive column on
  `court_filings`, or a dedicated `filing_submission_attempts` table, migration
  **0068**).
- Document transport: do we send document bytes inline or via the provider's
  upload endpoint, and how that interacts with native→PDF conversion (Gotenberg).

**Legal / counsel:**
- EFSP terms of service, data-residency, and PII handling for documents/parties
  crossing to the provider.
- Jurisdiction-by-jurisdiction authorization to file electronically; what
  attestations (if any) must accompany a filing — **must not** be auto-asserted
  by code.
- Retention/audit obligations for filing provenance (feeds the #426 audit log).

## First safe slice

The smallest correct, production-quality, non-gated change: **#426's error
taxonomy** — turn the bare `501` at `route.ts:36` into a structured, typed
response without enabling any live behaviour.

- Introduce a small error-code enum/type (e.g. `LIVE_ADAPTER_NOT_IMPLEMENTED`)
  and return `{ ok:false, code, error, retriable:false }` with status 501 (or
  503 "not yet available") instead of a bare string.
- Keep the readiness gate and `MockEfspAdapter` fallback exactly as-is; the live
  flag stays untouched.
- Add unit coverage for the structured response.

This is safe because it changes only the **shape of an error already returned**,
flips no flags, adds no migration, and gives every later child (#423–#425) a
consistent contract to surface real provider errors through. The provider
adapter itself (#423) is the next slice once a provider + sandbox credentials
exist (#427 [H]).

## Acceptance (epic)

A real filing submits to the provider **sandbox** end-to-end; status updates flow
back into the workspace via webhook/polling into `filing_status_events`; and the
route no longer returns a bare 501 when live filing is enabled — it returns
either a real submission or a structured, typed error.
