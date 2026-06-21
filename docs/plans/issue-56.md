# Issue #56 — [config] Enable upload malware scanning

> **Status: PLAN (blocked: wrong repo + compliance gate).** This PR carries a
> plan only. The change cannot and must not be implemented in this repository —
> see "Why this is a plan, not an implementation" below.

## The issue

`[config]` Enable upload malware scanning.

**Acceptance (inferred):** user-uploaded files are scanned for malware before
they are persisted; a malicious file is rejected; scanning is wired so it is
actually active in the running environment (not just present-but-disabled code).

## Why this is a plan, not an implementation

This worktree is the **`annoncedenounce.com`** repository — a static launch
site. Its entire surface is:

- `index.html`, `privacy.html`, `robots.txt`, `sitemap.xml`, `site.webmanifest`
  (static pages and metadata)
- `api/version.js`, `version.json` (a no-store version probe + banner)
- `scripts/verify-site.mjs`, `scripts/bump-version.mjs` (site tooling)
- `vercel.json` (headers/redirects/one function config)
- `package.json` with only `verify`, `version:bump`, `serve` scripts

There is **no file-upload path, no object storage (R2 / Blob), no ingest
endpoint, no scanner integration, and no backend able to receive bytes** in this
repo. The only `api/` function returns version JSON. A `grep` for
`upload|malware|scan|virus|clamav` finds nothing relevant — the only `scan`
hits are the autonomy *code*-security gate in `.github/workflows/` and
`autonomy.defaults.yml`, which is unrelated to *file-upload* malware scanning.

Issue #56 targets the **`juge.ca`** repository (whose `node_modules` this
worktree symlinks for deps). That repo already contains the upload-safety stack:

- `lib/trust/upload-safety.ts` — `scanUploadBeforeStorage(...)`, a malware
  scan (webhook / ClamAV / VirusTotal-reputation adapters) plus a CSAM scan,
  returning `clean | blocked | skipped | error`.
- `lib/trust/release-readiness.ts` — the **config gates**:
  `isUploadScanningConfigured()` (true iff one of `UPLOAD_SCANNER_WEBHOOK_URL`,
  `CLAMAV_URL`, `VIRUSTOTAL_API_KEY` is set), `uploadScanningRequired()`
  (`UPLOAD_SCANNING_REQUIRED`), and the `UPLOAD_SCANNING_LIVE` strict flag.
- `app/api/evidence/ingest/route.ts` — already calls `scanUploadBeforeStorage`
  and returns 422 (blocked) / 503 (scanner error) before storing.
- `lib/__tests__/upload-safety.test.ts` — existing coverage.

Implementing #56 here would mean fabricating an upload subsystem inside a static
marketing site, which violates the task hard rule "touch only files relevant to
this issue" and could not satisfy acceptance (there is nothing here to scan).
The correct home is `juge.ca`. This doc records the concrete plan so the issue
has a PR and the next agent (in the right repo) can execute directly.

## What "enable" actually means here — and the hard-rule blocker

The scanner **code already exists** in `juge.ca`. The issue is purely
`[config]`: making scanning *active* in the deployed environment. The only ways
to do that are:

1. Provision a scanner adapter — set **one** of `UPLOAD_SCANNER_WEBHOOK_URL`,
   `CLAMAV_URL`, or `VIRUSTOTAL_API_KEY` (real secrets / service URL).
2. Flip the strictness gate — set `UPLOAD_SCANNING_LIVE=true` (and/or
   `UPLOAD_SCANNING_REQUIRED=true`) so unconfigured/inconclusive uploads
   **fail closed** instead of silently `skipped`.

Step 2 flips a **compliance/safety gate**, which the workflow hard rules
explicitly forbid an autonomous agent from doing ("never flip
monetization/compliance gate flags or attestations"). Turning scanning to
`required`/`live` without a *provisioned, tested* scanner would also break
uploads (everything becomes `error` → 503). Both steps need a real secret and a
human owner. Hence: plan, not auto-flip.

## Sub-task checklist (execute in `juge.ca`)

- [ ] [ops] Choose the adapter: managed webhook vs. self-hosted ClamAV vs.
      VirusTotal reputation-only. (Reputation-only can't clear novel files, so
      it's insufficient as the sole scanner under strict mode.)
- [ ] [ops] Provision the chosen adapter's secret/URL in each environment
      (preview + prod) via the platform secret store — never commit it.
- [ ] [ops] Verify `isUploadScanningConfigured()` returns true in the target env.
- [ ] [code, tiny] If no change needed, none — adapters already branch on env.
      Only touch code if a new adapter type is required.
- [ ] [config, gated on human] Set `UPLOAD_SCANNING_LIVE=true` (strict/fail-closed)
      once the adapter is confirmed healthy. Optionally `UPLOAD_SCANNING_REQUIRED=true`.
- [ ] [test] Add/extend `lib/__tests__/upload-safety.test.ts`: EICAR test file
      → `blocked`; clean file → `clean`; scanner down under strict → `error`/503.
- [ ] [observability] Alert on a rising `error`/`blocked` rate from the ingest route.
- [ ] [docs] Note the chosen adapter + env vars in juge.ca ops docs / `.env.example`.

## Decisions required (human / architecture / counsel)

- **Ops/Security:** which scanner, who owns the credential rotation, SLA/cost.
- **Architecture:** sync scan-before-store (current 422/503 behavior) vs. async
  quarantine-then-scan for large files; size/timeout budget on the ingest path.
- **Counsel/Compliance:** retention of malicious-file metadata; whether content
  may be sent to a third-party (VirusTotal/webhook) vs. hash-only; interaction
  with the CSAM-reporting obligation already modeled alongside in `upload-safety.ts`.

## First safe slice

In `juge.ca`, provision a non-secret-leaking scanner adapter in the **preview**
environment only and add the EICAR + clean-file unit tests against
`scanUploadBeforeStorage`. Leave `UPLOAD_SCANNING_LIVE` **off** in production
until ops/counsel sign off and the adapter is proven healthy. This delivers a
verifiable scan in a non-prod env with zero compliance-gate flips and no risk of
breaking production uploads.

## Why no code changed in this repo

`annoncedenounce.com` has no upload surface, no scanner, and no ingest path, so
there is nothing here to enable. `scripts/verify-site.mjs` (the CI check)
validates only static files and the version probe; it has no notion of uploads.
Editing this repo for #56 would be incorrect and out of scope. Only this plan
doc is added.
