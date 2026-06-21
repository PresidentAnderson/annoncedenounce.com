# Plan — Issue #423: EFSP provider adapter (interface impl) — child of #412

> Status: PLAN (implementation blocked in this worktree — see "Why this is a plan, not an implementation")

## Why this is a plan, not an implementation

Issue #423 targets the **`juge.ca`** application (`app/api/filing/submit/route.ts`,
`lib/filing/efsp.ts`). The autonomy workflow assigned this task to an
**`annoncedenounce.com`** static-site worktree, which contains no Next.js `app/`
tree, no filing route, and none of the EFSP interfaces the issue references.

The correct, isolated approach (a dedicated `issue-423` worktree off
`juge.ca`'s `origin/main`, matching the existing
`.claude/worktrees/wf-issue-NNN` pattern used by sibling agents) was blocked by
the worktree-boundary guard ("stay in YOUR worktree only"). Implementing an EFSP
adapter inside the static marketing site would violate "touch only files relevant
to this issue" and would be non-functional.

Per the workflow's fallback rule ("If genuinely blocked on a real
implementation, STILL open a PR carrying a plan doc so the issue has a PR"), this
document is the deliverable. It is grounded in a full read of the live `juge.ca`
code so the implementation can be applied verbatim in the correct repo.

## Scope (from the issue, label `architecture`, priority:high)

Part of **#412**. Implement the EFSP **provider adapter** against the existing
interface, replacing the `501` path for the chosen provider.

Acceptance criteria:
- Adapter class implementing the interface for the selected provider.
- Auth/session handling for the provider API (sandbox first).
- Unit tests for the adapter surface.
- Adapter compiles + is selectable; sandbox auth succeeds.

## Current state in `juge.ca` (verified by reading the code)

`lib/filing/efsp.ts` already defines the full contract:

```ts
export interface EfspAdapter {
  provider: string;
  buildEnvelope(input: FilingEnvelope): Promise<FilingEnvelope>;
  submit(envelope: FilingEnvelope): Promise<FilingSubmission>;
  status(envelopeId: string): Promise<FilingStatusEvent>;
}
```

with `MockEfspAdapter` as the only implementation, plus `applyFilingStatusEvent`.

`app/api/filing/submit/route.ts` currently:
1. Authenticates the Supabase user, validates the body, requires `confirm`.
2. Calls `legalSuiteReadiness()`. If `readyForLiveFiling` is `true` it returns
   **`501 "live EFSP adapter is not implemented for this provider yet"`** — this
   is the exact 501 path #423 must replace.
3. Otherwise instantiates `MockEfspAdapter`, builds + submits, and (optionally)
   updates `court_filings`.

`lib/ops/legal-suite-readiness.ts` gates "live" mode on env:
`EFSP_LIVE_ENABLED === "1"` AND `EFSP_PROVIDER` + `EFSP_API_URL` + `EFSP_API_KEY`
AND `EFSP_WEBHOOK_SECRET` (the `efsp` readiness check).

`lib/filing/webhook.ts` already provides HMAC-SHA256 signature verification
(`filingWebhookSignature`, `verifyFilingWebhookSignature`,
`webhookPayloadToEvent`) — the live adapter's async status updates should arrive
through this existing webhook path, not by polling.

Tests run via `node --import tsx --test ...` (see the `test` script in
`package.json`). `lib/filing/__tests__/` exists but is currently empty.

## Concrete sub-task checklist (apply in `juge.ca`)

- [ ] **[A] Live adapter class** — add `LiveEfspAdapter implements EfspAdapter`
      to `lib/filing/efsp.ts` (or a new `lib/filing/efsp-live.ts` to keep the
      mock pure). `provider` comes from `EFSP_PROVIDER`. Constructor takes an
      injectable config `{ apiUrl, apiKey, provider, fetchImpl? }` so tests can
      stub `fetch` — do not read `process.env` inside the class; read it in a
      small `efspAdapterFromEnv()` factory.
- [ ] **[A] Provider auth/session handling (sandbox first)** — implement a
      private `authHeaders()` / token-exchange helper. Default to API-key bearer
      auth (`Authorization: Bearer ${apiKey}`) against `EFSP_API_URL`; if the
      chosen provider needs OAuth2 client-credentials, add a cached
      session-token fetch with expiry. Point base URL at the sandbox host via
      env. Never log the key.
- [ ] **[A] `buildEnvelope`** — validate (>=1 document, like the mock), map the
      internal `FilingEnvelope` to the provider's envelope schema. Keep the
      return type `FilingEnvelope` to honor the interface; do the provider-shape
      mapping inside `submit`.
- [ ] **[A] `submit`** — POST the mapped envelope to the provider, parse the
      response into `FilingSubmission` (`provider`, `envelopeId`, `status`,
      `submittedAt`). Map provider status strings to the internal
      `FilingStatus` union. Throw a typed error on non-2xx with the provider's
      error code (no secrets in the message).
- [ ] **[A] `status`** — GET the envelope status and map to `FilingStatusEvent`.
      Note async acceptances primarily flow via `lib/filing/webhook.ts`; this
      method is the pull/reconcile fallback.
- [ ] **Selectability** — add a factory (e.g. `createEfspAdapter()` /
      `efspAdapterFromEnv()`) that returns `LiveEfspAdapter` when
      `legalSuiteReadiness().readyForLiveFiling` is true, else `MockEfspAdapter`.
- [ ] **Wire the route** — in `app/api/filing/submit/route.ts`, replace the
      `501` early-return with `const adapter = createEfspAdapter();` and set
      `live: readiness.readyForLiveFiling` in the response. Keep the
      `confirm`/auth/validation guards unchanged.
- [ ] **[A] Unit tests** — add `lib/filing/__tests__/efsp-live.test.ts` using
      `node:test` with an injected fake `fetch`: cover (1) `buildEnvelope`
      rejects empty docs, (2) auth header is attached, (3) `submit` maps a
      sandbox 2xx into `FilingSubmission`, (4) provider→internal status mapping,
      (5) non-2xx throws without leaking the key. Register the new test file in
      the `package.json` `test` script.
- [ ] **Docs/env** — document the new sandbox env vars in `.env.example` / ops
      readiness notes (no real credentials committed).

## Decisions required before/while implementing (human / architecture / counsel)

1. **Which EFSP provider** (#412's "chosen provider") — Tyler Technologies
   Odyssey eFileSP vs. a state/provincial gateway vs. another vendor. Drives the
   envelope schema, auth model, and status vocabulary. **Architecture + counsel.**
2. **Auth model** — static API key vs. OAuth2 client-credentials vs. mTLS; where
   sandbox credentials are stored (Supabase secrets / Vercel env). **Architecture
   + security.**
3. **ECF/LegalXML conformance** — does the provider require NIEM/ECF 4.x or 5.0
   XML envelopes rather than JSON? If so, envelope mapping is materially larger
   and may warrant its own child issue. **Architecture.**
4. **Go-live gating** — confirm `EFSP_LIVE_ENABLED` stays the single source of
   truth and that flipping it is a separate, reviewed compliance step (do NOT
   flip it in this change). **Counsel + ops.**
5. **PII / filing-data handling** — retention and logging policy for envelope
   payloads and provider responses. **Counsel + security.**

## First safe slice (smallest correct change)

In `juge.ca`, on a `issue-423` branch off `origin/main`:

1. Add `LiveEfspAdapter` in `lib/filing/efsp-live.ts` with constructor-injected
   config + injectable `fetch`, implementing all three interface methods against
   the **sandbox** base URL with bearer-key auth (the most common provider
   default). Add `efspAdapterFromEnv()` factory.
2. Add `lib/filing/__tests__/efsp-live.test.ts` (injected fake fetch) and
   register it in the `package.json` test script.
3. Leave `app/api/filing/submit/route.ts` route wiring as a tiny follow-up commit
   once the provider in (#412) is confirmed — until then the adapter "compiles +
   is selectable" via the factory, satisfying the acceptance bar without
   prematurely enabling a live path.

This slice satisfies "adapter compiles + is selectable; sandbox auth succeeds"
without flipping any compliance/monetization gate and without touching
`lib/version.ts` or any migration.
