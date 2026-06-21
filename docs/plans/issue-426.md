# Plan — Issue #426: EFSP reliability (structured errors, idempotency, audit)

> Parent: #412. Child task [A]. Tracked in repo **PresidentAnderson/juge.ca**.

## Blocker: repo / worktree mismatch (why this is a plan, not an implementation)

The orchestrator assigned this issue to a worktree of **`annoncedenounce.com`**, but
issue #426 and **all** of the code it touches live in a **different repository,
`juge.ca`**:

- `gh issue view 426` resolves only in `juge.ca` (it does not exist in
  `annoncedenounce.com` — `GraphQL: Could not resolve to an issue ... 426`).
- The EFSP/filing code targeted by the acceptance criteria exists only in `juge.ca`:
  - `app/api/filing/submit/route.ts` (the route that returns the raw `501`)
  - `app/api/filing/webhook/route.ts`
  - `lib/filing/efsp.ts` (`MockEfspAdapter`, envelope/submission types)
  - `lib/ops/legal-suite-readiness.ts` (the live-filing readiness gate)
  - `supabase/migrations/` (next free number is **`0067`**)
- `annoncedenounce.com` is a static marketing/landing site (`index.html`,
  `privacy.html`, `sitemap.xml`, …) with **no filing, EFSP, or audit code at all**.
- The SETUP step symlinks `juge.ca/node_modules` into this worktree, confirming the
  intended build target is `juge.ca`, not this repo.

The task's HARD RULES require staying inside this worktree and never touching another
repo's branch. Implementing the feature would mean editing `juge.ca` files outside this
worktree, and a PR opened from here targets `annoncedenounce.com` and therefore cannot
`Closes #426` (cross-repo close is not possible). So per the fallback instruction
("if genuinely blocked, STILL open a PR carrying a plan doc (Refs #426)"), this PR ships
the plan only. **The implementation below must be executed in a `juge.ca` worktree.**

## Scope (in `juge.ca`)

Make EFSP court filing reliable and auditable:

1. **Error taxonomy → structured responses** — replace the bare `501` (and the ad-hoc
   `{ ok:false, error }` strings) with a typed error envelope so callers can branch on a
   stable `code`, never a raw HTTP status or free-text message.
2. **Idempotency keys** — prevent double-filing when a client retries `POST /api/filing/submit`.
3. **Audit log every submission** (provenance) + sandbox integration tests
   (happy path + rejection path).

**Acceptance:** double-submit is safe; every submission is audited; tests green.

## Current behaviour (baseline in `juge.ca`)

`app/api/filing/submit/route.ts`:
- `bad(error, status)` returns `{ ok:false, error }` with raw strings ("unauthorized",
  "live EFSP adapter is not implemented for this provider yet", …).
- When `legalSuiteReadiness().readyForLiveFiling` is true it returns a **raw `501`** with
  a free-text message — the exact symptom #426 calls out.
- On the mock path it builds an envelope, submits via `MockEfspAdapter`, optionally updates
  `court_filings`, and returns the submission. **No idempotency guard and no audit write.**

`lib/filing/efsp.ts` already produces a *deterministic* `envelopeId`
(`MOCK-<hash(matterId:title:documentIds)>`) — useful as a natural idempotency anchor for
the mock adapter, but not a substitute for a request-scoped idempotency key.

An audit-chain substrate already exists: `lib/security/audit-substrate.ts`
(`appendAuditChainEvent`, append-only, hash-chained per tenant, enforced by migration
`0062`). Reuse it — do **not** invent a new audit table.

## Sub-task checklist (smallest correct slices, in order)

- [ ] **1. Error taxonomy (`lib/filing/errors.ts`, new).**
  - `type FilingErrorCode = "unauthenticated" | "backend_unconfigured" |
    "validation_failed" | "confirmation_required" | "provider_not_implemented" |
    "idempotency_conflict" | "submission_failed"`.
  - `class FilingError extends Error { code; httpStatus; details?; }` and a
    `filingErrorResponse(err): NextResponse` that emits
    `{ ok:false, error:{ code, message, details? } }` with the mapped status.
  - Map `provider_not_implemented` → `501` **but** with a structured body (no raw 501).
    Keep all current statuses (401/503/400/409) behind named codes.
- [ ] **2. Rework `app/api/filing/submit/route.ts`** to throw `FilingError`s and funnel all
    responses through `filingErrorResponse`. Pure refactor of existing branches; no behaviour
    change beyond response shape. Update any client/tests that asserted the old string body.
- [ ] **3. Idempotency.**
  - Accept an `Idempotency-Key` request header (and/or `body.idempotencyKey`).
  - Add migration **`0067_filing_idempotency.sql`** (additive only): table
    `filing_idempotency (tenant_id, idempotency_key, request_hash, response_json,
    status, created_at)` with `unique (tenant_id, idempotency_key)` and service-role-only RLS
    matching the pattern in `0062`/`0045`.
  - Flow: look up `(tenant, key)`. If present and `request_hash` matches → replay stored
    response (200, safe double-submit). If present and hash differs → `idempotency_conflict`
    (409, structured). If absent → reserve the key, submit, persist the response.
  - For the mock path, fall back to the deterministic `envelopeId` so a retry without a key
    still does not create a second envelope.
- [ ] **4. Audit every submission.** On every successful submit (and on rejection), call
    `appendAuditChainEvent` with action e.g. `filing.submitted` / `filing.rejected`,
    provenance = `{ matterId, court, documentIds, provider, envelopeId, idempotencyKey,
    userId }`. Reuse the existing tenant resolution used elsewhere in the route.
- [ ] **5. Sandbox integration tests** (`lib/__tests__/` or `app/api/filing/__tests__/`):
  - happy path → `ok:true`, audit row appended, response shape stable;
  - rejection path → structured error with the right `code`/status, audit row appended;
  - **double-submit** with same key → second call replays, no second envelope/audit-of-record;
  - conflicting reuse of a key → `idempotency_conflict`.
- [ ] **6. Verify.** `node_modules/.bin/tsc --noEmit` adds no new errors in touched files;
    run the filing test suite; if locale strings change, `npm run check:locales`.

## Decisions requiring a human / architecture / counsel

- **Idempotency key authority:** client-supplied `Idempotency-Key` vs. server-derived from
  matter+documents (or both). Affects API contract — needs API-owner sign-off.
- **Idempotency retention / replay TTL:** how long stored responses are replayable, and
  whether a superseded filing may be re-filed. Records-retention / counsel input.
- **Error taxonomy as public contract:** the `code` strings become a stable external API;
  needs product/architecture review before release. Also confirm whether the structured
  `provider_not_implemented` should stay `501` or move to `503`/`409`.
- **Audit provenance fields & PII:** exactly which fields (document IDs? titles?) are written
  to the immutable audit chain — privacy/counsel review, since the chain is append-only.
- **Live-filing gate untouched:** `EFSP_LIVE_ENABLED` and the `legalSuiteReadiness` gate are
  monetization/compliance flags — do **not** flip them in this work.

## First safe slice (do this first, in `juge.ca`)

Sub-tasks **1 + 2** only: introduce `lib/filing/errors.ts` and convert
`app/api/filing/submit/route.ts` to structured error responses (including the formerly-raw
`501`). This is a self-contained, low-risk refactor that immediately satisfies
"no raw 501 when live", lands the contract idempotency and audit will build on, and ships
without any schema migration. Idempotency (migration `0067`) and audit wiring follow as
slices 3–4 once the decisions above are settled.
