# Plan — Issue #427: EFSP provider selection + production go-live

> **Mode:** PLAN (epic / human-gated). This document is the deliverable. Do **not** build
> the feature from this PR. Implementation lands in the `juge.ca` application repo, gated
> behind the human/credentials and legal decisions captured below.
>
> **Refs #427** — child of epic **#412** ("Court filing — live EFSP adapter; replace the
> 501 in `/api/filing/submit`").

## Where the work actually lives

Issue #427 is filed against this static launch site, but the e-filing system it describes
lives in the **`juge.ca`** application repository. The relevant code paths there are:

- `app/api/filing/submit/route.ts` — the submit endpoint that currently returns **501**.
- `app/api/filing/webhook/route.ts` — provider status callbacks (HMAC-verified).
- `lib/filing/efsp.ts` — the `EfspAdapter` interface (`buildEnvelope`, `submit`, `status`)
  plus the `MockEfspAdapter`.
- `lib/filing/webhook.ts` — payload parse + signature verify helpers.
- `lib/ops/legal-suite-readiness.ts` — the `legalSuiteReadiness()` gate that reads the
  EFSP env vars and decides `readyForLiveFiling`.

This plan exists in the launch-site repo so the issue carries a PR and an agreed scope; the
code changes are tracked and executed in `juge.ca`.

## Scope of #427

#427 is the **go-live slice** of epic #412. It is deliberately narrow:

- **[H]** Choose the EFSP provider(s) — Tyler Technologies, InfoTrack, or another — possibly
  one provider per jurisdiction.
- **[H]** Obtain **sandbox + production** credentials for the chosen provider(s).
- **[A]** Add provider env vars / keys to Vercel (sandbox + prod environments).
- **[H]** Per-jurisdiction production flag flip.

**Acceptance:** live filing enabled for at least one jurisdiction against **production**
credentials.

It is **not** the adapter implementation, payload mapping, document upload, status polling,
error taxonomy, idempotency, or sandbox tests — those are sibling sub-tasks of #412
(see #423–#426). #427 assumes a working live adapter exists and turns it on safely.

## Sub-task checklist

### Provider selection — [H]
- [ ] Compare candidate EFSPs (Tyler / InfoTrack / other) on jurisdiction coverage, API
      shape (REST vs SOAP/ECF), fee handling, service-of-process support, and contract terms.
- [ ] Decide single-provider vs per-jurisdiction provider matrix; record the decision.
- [ ] Sign provider agreement(s); capture support/escalation contacts and SLA.

### Credentials & environment — [H] obtain, [A] wire
- [ ] Obtain **sandbox** credentials (API URL, API key, webhook secret).
- [ ] Obtain **production** credentials (separate API URL, API key, webhook secret).
- [ ] **[A]** Set the following env vars in Vercel, scoped per environment, never committed:
      - `EFSP_PROVIDER`
      - `EFSP_API_URL`
      - `EFSP_API_KEY`
      - `EFSP_WEBHOOK_SECRET`
      - `EFSP_LIVE_ENABLED` (`1` only when going live for a jurisdiction)
- [ ] **[A]** Confirm `legalSuiteReadiness()` reports the `efsp` check as `ready` once all
      four credential vars + `EFSP_LIVE_ENABLED=1` are present.

### Go-live gating — [A]/[H]
- [ ] **[A]** Fix the readiness gate inversion (see "Decisions" below) so that enabling live
      mode actually routes to the live adapter rather than returning 501.
- [ ] **[A]** Confirm `/api/filing/submit` returns a real submission (not 501, not mock)
      once live mode + a live adapter are in place.
- [ ] **[A]** Register the provider webhook URL (`/api/filing/webhook`) with the provider and
      verify HMAC signature round-trips against `EFSP_WEBHOOK_SECRET`.
- [ ] **[H]** Flip the per-jurisdiction production flag for the first launch jurisdiction.

### Verification & rollback — [A]/[H]
- [ ] **[A]** Submit one real filing in the launch jurisdiction; confirm `accepted` →
      `filed` status events flow back into the workspace via the webhook.
- [ ] **[A]** Document an instant rollback: setting `EFSP_LIVE_ENABLED=0` (or clearing the
      jurisdiction flag) returns the route to mock/prep mode with no data loss.
- [ ] **[H]** Sign off on go-live for the jurisdiction.

## Decisions required before / during build

### Human / business — [H]
1. **Provider choice** and whether it is uniform or per-jurisdiction. Blocks everything.
2. **Which jurisdiction goes live first** (drives which prod credentials and court/location
   codes are needed first).
3. **Budget / contract** sign-off for the EFSP (per-filing fees, minimums).

### Counsel / compliance — [H]
4. **Authorization to file** electronically in the launch jurisdiction (court rules, e-filing
   registration, any required law-firm/registered-agent status).
5. **Data residency & PII handling** for filing payloads (parties, documents) sent to a
   third-party EFSP — confirm acceptable under the project's privacy posture and the
   jurisdiction's rules.
6. **Attestation/consent** wording shown to the human filer before a live submission.
   (The submit route already requires explicit `confirm: true`; counsel confirms the copy.)

### Architecture — [A] with review
7. **Readiness-gate logic.** In `juge.ca/app/api/filing/submit/route.ts` (and the webhook
   route) the gate currently reads:

   ```ts
   const readiness = legalSuiteReadiness();
   if (readiness.readyForLiveFiling) {
     return bad("live EFSP adapter is not implemented for this provider yet", 501);
   }
   // ...falls through to MockEfspAdapter
   ```

   This is an **inverted placeholder**: turning live mode *on* currently *blocks* filing with
   a 501 and only the mock path runs when live mode is *off*. Going live requires replacing
   this branch so that `readyForLiveFiling === true` selects the **live** adapter and the mock
   adapter remains the fallback when live mode is off. This swap belongs with the live-adapter
   implementation (#412 / sibling), but #427 must not flip `EFSP_LIVE_ENABLED=1` in
   production until it is done — otherwise live filing returns 501.

8. **Provider abstraction for per-jurisdiction routing** — if more than one provider is
   chosen, decide whether `EFSP_PROVIDER` becomes a map keyed by jurisdiction and how the
   adapter is selected at request time.

## First safe slice

The smallest safe step that moves #427 forward **without** risking a live submission:

1. **[H]** Make the provider decision and obtain **sandbox** credentials only.
2. **[A]** Add the sandbox `EFSP_*` env vars to Vercel **Preview** (not Production), with
   `EFSP_LIVE_ENABLED` left **unset/`0`**.
3. **[A]** In `juge.ca`, fix the inverted readiness-gate branch (item 7) so the code path is
   correct, while production stays in mock mode because `EFSP_LIVE_ENABLED` is not `1`.
4. **[A]** Verify `legalSuiteReadiness()` and the submit/webhook routes behave correctly in
   the sandbox (real adapter path exercised, signature verification round-trips).

Production credentials, `EFSP_LIVE_ENABLED=1`, and the per-jurisdiction flag flip are the
**final** human-gated steps and are explicitly out of scope for the first slice.

## Out of scope (tracked elsewhere)

- Live adapter implementation, payload→envelope mapping, document upload/validation, status
  polling, error taxonomy, idempotency keys, audit logging, sandbox integration tests —
  epic **#412** and siblings **#423–#426**.
- Any change to this launch site's code (this repo only carries the plan).
