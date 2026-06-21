# Plan — Issue #418: Go-live for upload malware scanning (VirusTotal)

> **Mode:** PLAN (ops go-live / human-gated). This document is the deliverable. Do **not**
> build the feature from this PR. The scanning code already exists in the `juge.ca`
> application repo; #418 is the operational flip-the-switch slice, gated on the
> human/credentials and fail-policy decisions captured below.
>
> **Refs #418** — child of epic **#411**; config-flag tracker **#56**.

## Where the work actually lives

Issue #418 is filed against this static launch site, but upload malware scanning lives in
the **`juge.ca`** application repository, and it is **already implemented and unit-tested**
there. The relevant code paths are:

- `lib/trust/upload-safety.ts` — `scanUploadBeforeStorage()`. Computes a server-side SHA-256,
  then runs `malwareScan()` + `csamScan()` in parallel. `malwareScan()` prefers a content
  scanner (`UPLOAD_SCANNER_WEBHOOK_URL`, then `CLAMAV_URL`) and otherwise falls back to a
  **VirusTotal** hash-reputation lookup (`virusTotalLookup`, `GET {VIRUSTOTAL_API_URL}/files/{sha256}`
  with `x-apikey`). Returns a verdict of `clean | blocked | skipped | error`.
- `lib/trust/release-readiness.ts` — `isUploadScanningConfigured()` (any of
  `UPLOAD_SCANNER_WEBHOOK_URL` / `CLAMAV_URL` / `VIRUSTOTAL_API_KEY`), `uploadScanningRequired()`
  (`UPLOAD_SCANNING_REQUIRED`), and the `uploadScanning` signal in `trustReadinessServices()`
  (`envOn("UPLOAD_SCANNING_LIVE") && isUploadScanningConfigured()`), surfaced via `/api/health`.
- `app/api/evidence/ingest/route.ts` — calls `scanUploadBeforeStorage()` **before** the
  Supabase `storage.from("evidence").upload(...)` call. On `blocked` it returns **422**, on
  `error` (scanner-down in strict mode) it returns **503**, both with the scan `reason`.
- `lib/__tests__/upload-safety.test.ts` — covers skip-when-not-required, VirusTotal
  malicious → `blocked`, VirusTotal benign → `clean`, VirusTotal-unknown-hash → `error`
  (fail-closed), and a ClamAV/EICAR-signature `blocked` path.

This plan exists in the launch-site repo so the issue carries a PR and an agreed go-live
runbook; the code already exists and any small follow-up edits are tracked and executed in
`juge.ca`.

## Scope of #418

#418 is the **go-live slice** of epic #411. The build is done; what remains is operational
and human-gated:

- **[H]** Provision a real **VirusTotal** API key (or the chosen scanner) and **formally
  decide fail-closed vs fail-open** when the scanner is unavailable.
- **[A]** Set the production env vars and confirm `release-readiness.ts` recognizes them.
- **[A]** Confirm scan-on-upload is wired before persist with quarantine/reject UX +
  audit logging, honoring `UPLOAD_SCANNING_REQUIRED` (mostly done — see Decisions item 3).
- **[A]** Smoke-test EICAR detection + clean-file pass-through (extend
  `upload-safety.test.ts` if an EICAR-content case is desired alongside the existing
  signature/stat cases).
- **[H]** Flip `UPLOAD_SCANNING_LIVE=1` in production.
- **[A]** Post-flip monitoring of scan latency/failures and alerting on scanner-down per the
  documented fail policy.

**Acceptance (from the issue):** EICAR rejected in prod; clean uploads unaffected;
scanner-down path is deliberate and monitored; `release-readiness` reports `uploadScanning`
green.

## Sub-task checklist

### Credentials & fail policy — [H]
- [ ] Provision a VirusTotal production API key (or confirm the chosen scanner —
      `UPLOAD_SCANNER_WEBHOOK_URL` content scanner or `CLAMAV_URL`).
- [ ] **Decide fail-closed vs fail-open** for scanner-unavailable and record it. The code is
      **fail-closed in strict mode**: when `UPLOAD_SCANNING_REQUIRED=1` or
      `UPLOAD_SCANNING_LIVE=1`, an unreachable scanner or an unknown VirusTotal hash yields
      `error` → the ingest route returns **503** and the file is **not persisted**. Fail-open
      would require explicitly *not* setting strict mode (or a new flag) — do not do this
      silently; it must be a recorded decision.
- [ ] Note the rate-limit / quota posture of the VirusTotal tier chosen (public API is
      4 req/min, 500/day — likely insufficient for production; confirm a paid tier or prefer
      a content-scanning webhook/ClamAV for real clean verdicts on novel files).

### Environment — [A] wire, never commit secrets
- [ ] Set in Vercel **Production** (and **Preview** first, for the smoke test):
      - `VIRUSTOTAL_API_KEY`
      - `VIRUSTOTAL_API_URL` (optional; defaults to `https://www.virustotal.com/api/v3`)
      - `UPLOAD_SCANNER_WEBHOOK_URL` (if a content scanner is the primary adapter)
      - `UPLOAD_SCANNING_REQUIRED=1` (strict / fail-closed during ingest)
- [ ] Confirm `/api/health` reports `uploadScanning` becoming `true` only once
      `UPLOAD_SCANNING_LIVE=1` **and** a scanner var is present
      (`uploadScanningRequested && isUploadScanningConfigured()`).

### Wiring verification — [A]
- [ ] Confirm `scanUploadBeforeStorage()` runs **before** the Supabase upload in
      `app/api/evidence/ingest/route.ts` (it does today, line ~111).
- [ ] Confirm reject UX: `blocked` → **422** with `scan.reason`; scanner-down → **503**.
- [ ] **Audit-log gap (see Decisions item 3):** add a structured audit-log entry on
      `blocked`/`error` (quarantine event) in the ingest route. Today the route returns the
      verdict to the client but does not write a server-side audit record of the rejection.

### Smoke test — [A]
- [ ] Verify the existing `upload-safety.test.ts` cases pass (VirusTotal malicious → blocked,
      benign → clean, unknown → error, ClamAV/EICAR signature → blocked).
- [ ] Optionally add a test that posts the canonical EICAR string
      (`X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*`) through the
      configured adapter and asserts `blocked`.
- [ ] In Preview: upload an EICAR file → expect 422 + quarantine; upload a clean PDF →
      expect 200 and the document persisted with a `hash`.

### Go-live & monitoring — [H] flip, [A] monitor
- [ ] **[H]** Flip `UPLOAD_SCANNING_LIVE=1` in Production (after the Preview smoke test
      passes and the fail policy is recorded).
- [ ] **[A]** Monitor scan latency and failure rate; alert on sustained scanner-down per the
      documented fail policy (especially because fail-closed turns scanner-down into upload
      **503s** for users — outages are user-visible and must page someone).
- [ ] **[A]** Add a rollback note: setting `UPLOAD_SCANNING_LIVE=0` (and clearing
      `UPLOAD_SCANNING_REQUIRED`) returns ingest to skip-scan mode with no data loss; only do
      this as a deliberate, recorded incident action.

## Decisions required before / during go-live

### Human / business — [H]
1. **Scanner & tier.** VirusTotal hash-reputation only confirms known-good/known-bad; a
   **novel** file is unknown and, in strict mode, is rejected (fail-closed). For real clean
   verdicts on first-seen files, a content scanner (`UPLOAD_SCANNER_WEBHOOK_URL`) or
   `CLAMAV_URL` is preferable. Decide the primary adapter and the VirusTotal role
   (primary vs known-bad backstop).

### Counsel / compliance — [H]
2. **Fail-closed vs fail-open** is a compliance decision: fail-closed blocks all uploads when
   the scanner is down (safer, user-visible outages); fail-open admits unscanned files during
   an outage (worse safety posture). Record the chosen posture and its rationale. Do **not**
   change the existing strict/fail-closed behavior without this sign-off.

### Architecture — [A] with review
3. **Audit logging on quarantine.** The issue requires "quarantine + reject UX +
   **audit-log**". Reject UX (422/503 with reason) and quarantine (never-persisted) are in
   place; an explicit server-side **audit record** of each rejection is **not**. Smallest fix:
   in `app/api/evidence/ingest/route.ts`, before returning the 422/503, write a structured
   audit entry (matter id, filename, sha256, verdict, reason, actor) via the existing audit
   sink. This is a small, additive change in `juge.ca` and should land before or with the
   production flip. Track it as the one outstanding code task.

## First safe slice

The smallest safe step that moves #418 forward **without** risking a bad production flip:

1. **[H]** Provision the scanner credential (sandbox/dev key first) and record the
   fail-closed vs fail-open decision.
2. **[A]** Set `VIRUSTOTAL_API_KEY` (+ `UPLOAD_SCANNER_WEBHOOK_URL`/`CLAMAV_URL` if used) and
   `UPLOAD_SCANNING_REQUIRED=1` in Vercel **Preview** only, with `UPLOAD_SCANNING_LIVE`
   left **unset**. Production stays unaffected.
3. **[A]** In `juge.ca`, add the audit-log entry on `blocked`/`error` in the ingest route
   (Decisions item 3) and run `upload-safety.test.ts`.
4. **[A]** Smoke-test in Preview: EICAR → 422 quarantine; clean file → 200 persisted; kill
   the scanner URL → 503 (fail-closed confirmed). Verify `/api/health` `uploadScanning`.

Production `VIRUSTOTAL_API_KEY`, `UPLOAD_SCANNING_LIVE=1`, and the monitoring/alerting setup
are the **final** human-gated steps and are explicitly out of scope for the first slice.

## Out of scope (already done or tracked elsewhere)

- The scanner implementation, VirusTotal adapter, strict/fail-closed logic, scan-before-persist
  wiring, and the EICAR/clean unit tests — **already implemented** in `juge.ca`
  (`lib/trust/upload-safety.ts`, `app/api/evidence/ingest/route.ts`,
  `lib/__tests__/upload-safety.test.ts`).
- CSAM hash matching (`CSAM_*` env, `CSAM_SAFETY_LIVE`) — sibling trust-layer go-live, not #418.
- Any change to this launch site's code (this repo only carries the plan).
