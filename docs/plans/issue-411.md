# Issue #411 — Live third-party operations: production go-live (epic)

> **Mode: PLAN (epic / human-gated).** This document is the deliverable. It does
> **not** build a feature and does **not** flip any production flag, gate, or
> attestation. It sequences the five per-integration go-lives, records the
> human/architecture/counsel decisions each one needs, and names the first safe
> slice for the whole epic.

## Cross-repo note (read first)

Issue #411 and its children live in **`PresidentAnderson/juge.ca`**, where the
implementation surface exists (`lib/trust/release-readiness.ts`,
`lib/trust/upload-safety.ts`, the payouts/EFT rails, the Drive import pipeline,
`supabase/migrations/`, and the i18n locales).

The assigned autonomy worktree is on **`annoncedenounce.com`**, the static
marketing/landing site (`index.html`, `privacy.html`, `vercel.json`). It
contains **none** of that application surface — no `lib/`, no Next.js app, no
`tsconfig.json`, no `check:locales` script. Therefore the epic's executable
slices must land in `juge.ca`; this PR carries the orchestration plan so #411
has an associated PR, matching the pattern already used by the child plan PRs in
this repo (#65 → #421, #67 → #422, #69 → #419).

**Required human action:** route the implementation slices below to
`PresidentAnderson/juge.ca` (or re-point the autonomy worktree there).

## Scope

Take five third-party integrations from "code gate present" to "live in
production," **in dependency order**, without duplicating the per-feature config
issues. The epic owns *sequencing, gating, and acceptance*; each child owns the
mechanical go-live for one integration.

| # | Integration | Child | Config | Readiness gate signal | Live flag(s) | A/H |
|---|-------------|-------|--------|-----------------------|--------------|-----|
| 1 | Transactional email/SMS (Resend / Twilio) | #420 | #61, also #103 | `transactionalEmail`, `transactionalSms` | `TRANSACTIONAL_COMMS_LIVE`, `TRANSACTIONAL_SMS_LIVE` | A + H |
| 2 | Upload malware scanning (VirusTotal) | #418 | #56 | `uploadScanning` | `UPLOAD_SCANNING_LIVE` (+ `UPLOAD_SCANNING_REQUIRED`) | A + H |
| 3 | Google OAuth + Drive import | #421 | #58 | `googleOAuth`, `googleDrive` | (env-presence gated; no live flag) | A + H |
| 4 | Stripe Connect / EFT payouts | #422 | #59, epic #413 | `providerPayouts` | `PROVIDER_PAYOUTS_LIVE`, `CA_EFT_COMPLIANCE_APPROVED` | A + **H/counsel** |
| 5 | CSAM hash-match + NCMEC reporting | #419 | #57 | `csamSafety` | `CSAM_SAFETY_LIVE` | A + **H/legal** |

Gate signals are computed by `trustReadinessServices()` in
`lib/trust/release-readiness.ts` and surfaced (without secret values) on
`/api/health`. Each signal already requires **both** a `*_LIVE`-style flag
**and** the integration's env keys to be present, so no single agent action can
turn an integration on by itself — a human still owns the flag flip.

## Sequencing rationale

The order is chosen so each step de-risks the next and so the two gated items
land last:

1. **Email/SMS first (#420).** It is the lowest-risk integration and unblocks
   magic-link delivery (#103, `docs/SUPABASE_RECOVERY_RUNBOOK.md`). Reliable
   transactional delivery is also the notification channel that later
   integrations (payout receipts, takedown/CSAM operator alerts) depend on.
2. **Upload malware scanning (#418).** Establishes the scan-on-upload +
   quarantine + reject-UX path that the CSAM matcher reuses. Must be live before
   CSAM so the upload pipeline already fails closed on bad content.
3. **Google OAuth + Drive import (#421).** Independent of 1–2; sequenced here so
   imported files flow through the already-live scan path from step 2.
4. **Stripe Connect / EFT payouts (#422).** Counsel-gated via the monetization
   epic #413; depends on email (step 1) for payout notifications. Money movement
   lands only after the safety rails above are live.
5. **CSAM matcher + NCMEC reporting (#419).** Legal-gated (vendor + reporting
   agreement). Sequenced last: it depends on the scan pipeline (step 2) and the
   operator-alert channel (step 1), and carries the highest legal exposure, so
   it ships only once everything else is proven in production.

## Reusable go-live pattern (apply per integration)

- [ ] **[H]** Pick vendor + create production account.
- [ ] **[H]** Provision production credentials / keys.
- [ ] **[A]** Add keys to **Vercel env** (no secrets in repo); confirm the
  adapter reads env + the readiness gate recognizes the key.
- [ ] **[A]** Add a smoke test / health check for the integration.
- [ ] **[H]** Flip the production `*_LIVE` flag (and any attestation flag).
- [ ] **[A]** Post-flip verification + monitoring/alert wiring.

## Per-integration sub-task checklist (epic-level summary)

> Full env vars, gate references, and `[A]`/`[H]` steps for each integration
> live in the child issues and their plan docs. This is the tracking surface for
> the epic only.

### 1. Transactional email/SMS — #420 (config #61, fixes #103)
- [ ] **[H]** Resend account + verified sender domain; DKIM/SPF/DMARC records.
- [ ] **[H]** Twilio account + verified `TWILIO_FROM_NUMBER` (if SMS in scope).
- [ ] **[A]** Env: `RESEND_API_KEY`; `TWILIO_ACCOUNT_SID`/`AUTH_TOKEN`/`FROM_NUMBER`.
- [ ] **[A]** Send smoke test (email + SMS) behind the readiness gate.
- [ ] **[H]** Flip `TRANSACTIONAL_COMMS_LIVE` (and `TRANSACTIONAL_SMS_LIVE`).
- [ ] **[A]** Verify magic-link delivery end to end (closes the #103 gap).

### 2. Upload malware scanning — #418 (config #56)
- [ ] **[H]** Choose scanner (VirusTotal / Cloudmersive / self-host ClamAV) + account.
- [ ] **[A]** Env: `VIRUSTOTAL_API_KEY` (or `UPLOAD_SCANNER_WEBHOOK_URL` / `CLAMAV_URL`).
- [ ] **[A]** Wire scan-on-upload + quarantine path + reject UX; smoke test.
- [ ] **[H]** Flip `UPLOAD_SCANNING_LIVE`; decide whether `UPLOAD_SCANNING_REQUIRED`
  is set (fail-closed posture).

### 3. Google OAuth + Drive import — #421 (config #58)
- [ ] **[H]** Google Cloud OAuth client + consent screen + Drive read-only scope.
- [ ] **[A]** Env: `GOOGLE_CLIENT_ID`/`SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`,
  `NEXT_PUBLIC_GOOGLE_API_KEY`.
- [ ] **[A]** OAuth flow + Drive read smoke test; imported files routed through
  the (now live) scan path.

### 4. Stripe Connect / EFT payouts — #422 (config #59, epic #413) — counsel-gated
- [ ] **[H/counsel]** Connect dashboard config per edition; tax/1099 + CA EFT sign-off.
- [ ] **[A]** Env: `STRIPE_SECRET_KEY`, `STRIPE_CONNECT_WEBHOOK_SECRET`,
  `ENCRYPTION_KEY`; EFT key or `EFT_BATCH_EXPORT_ENABLED`.
- [ ] **[A]** `isTestMode()` honored; test-mode payout smoke test; add the
  missing `payout.paid` / `payout.failed` webhook handling (see #422 plan).
- [ ] **[H]** Flip `PROVIDER_PAYOUTS_LIVE` (+ `CA_EFT_COMPLIANCE_APPROVED` for CA).

### 5. CSAM matcher + NCMEC reporting — #419 (config #57) — legal-gated
- [ ] **[H/legal]** PhotoDNA / Thorn Safer vendor + NCMEC reporting agreement.
- [ ] **[A]** Env: `CSAM_HASH_MATCHER_URL`.
- [ ] **[A]** Hash-match-on-upload + report hook + immutable audit (see #419 plan).
- [ ] **[H]** Flip `CSAM_SAFETY_LIVE` only after legal sign-off.

## Human / architecture / counsel decisions required before flag flips

1. **Vendor selection per integration** (email, SMS, scanner, OAuth, payouts,
   CSAM) — credentials and contracts are `[H]` and cannot be agent-decided.
2. **CSAM legal pathway (#419)** — NCMEC reporting agreement, preservation /
   legal-hold storage, and report-delivery design require counsel and the
   platform-safety owner. Highest-risk gate; ships last.
3. **Payouts / monetization counsel (#422 / #413)** — fee/referral model, tax
   and 1099 obligations, CA EFT compliance attestation, and the
   reconciliation source-of-truth all need counsel before `PROVIDER_PAYOUTS_LIVE`.
4. **Fail-closed posture for uploads (#418)** — decide whether
   `UPLOAD_SCANNING_REQUIRED` is enabled (reject on scanner outage vs. degrade).
5. **Flag-flip ownership and runbook** — who owns each `*_LIVE` flip, in what
   order, and the rollback/monitoring plan. No agent flips a production gate.
6. **Secrets management** — all keys via Vercel env per OPERATING_CANON; no
   secrets in the repo.
7. **Migrations** — any DB change in `juge.ca` is **additive-only at the next
   free number `0068_*`** (current head: `0067_matter_activity.sql`).

## First safe slice (agent-doable, inert until a human flips a flag)

Pick the **lowest-risk, highest-leverage** integration — transactional
email/SMS (#420) — and land only the parts that change no production behaviour
until a human acts:

1. **Smoke-test + health surfacing** for email/SMS in `juge.ca` behind the
   existing `transactionalEmail` / `transactionalSms` readiness signals, with
   mocked providers in CI (no live sends).
2. **Magic-link delivery verification harness** that exercises the path used by
   #103, runnable in test mode against the recovery runbook.
3. **No env keys committed, no `*_LIVE` flag flipped, no `lib/version.ts` edit.**
   The slice is dormant until a human adds the Resend/Twilio keys to Vercel env
   and flips `TRANSACTIONAL_COMMS_LIVE`.

This proves the go-live pattern end to end on the safest integration, unblocks
#103, and leaves the riskier gated items (#422, #419) for later slices once
counsel/legal have signed off.

## Acceptance (epic)

Each integration is **live in production, smoke test green, monitored, flag on**
— tracked to completion via its per-feature child issue (#418, #419, #420, #421,
#422). #411 closes when all five children are closed and `/api/health` reports
every corresponding readiness signal green in production.

Refs #411.
