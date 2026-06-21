# Plan — Issue #419: Go-live CSAM hash-match + reporting (child of #411)

> **Mode:** PLAN (epic / human- and legal-gated). This document is the deliverable.
> Do **not** build the feature from this PR. The flip of `CSAM_SAFETY_LIVE=1` is a
> human/legal action and must not be performed by an agent.

## Cross-repo note (read first)

Issue #419 is filed on **`PresidentAnderson/juge.ca`** and all the code it
references lives there (`lib/trust/release-readiness.ts`,
`lib/trust/upload-safety.ts`, `lib/__tests__/upload-safety.test.ts`, the audit
substrate in `lib/security/audit-substrate.ts`). This repo
(`annoncedenounce.com`) is the static marketing/landing site and contains none
of that code. Because the assigned worktree is on `annoncedenounce.com`, this PR
carries only the **plan** so the issue has an associated PR (`Refs #419`); the
actual implementation slices below must land as PRs in the **juge.ca** repo.
All file paths in the checklist are relative to the **juge.ca** repo root.

## Scope

Take the already-implemented CSAM hash-match scan path from "wired but dormant"
to "live and reporting" for production uploads:

- A test-hash match **blocks** the upload, **preserves** the asset and metadata,
  **triggers a report** to the legal reporting pathway, and writes an
  **immutable audit** record — **with no human preview of the asset**.
- `lib/trust/release-readiness.ts` reports `csamSafety: true` only when the
  matcher is configured **and** `CSAM_SAFETY_LIVE` is on (this gate already
  exists and must stay conservative / fail-closed).
- `release-readiness` is green for the CSAM signal in the target environment.

### Already in place (do not rebuild)

- `csamScan()` in `lib/trust/upload-safety.ts` already calls the matcher at
  `CSAM_HASH_MATCHER_URL`, passes `CSAM_REPORTING_CONTACT`, and fails **closed**
  (verdict `error`, upload not stored) when live but unconfigured or
  inconclusive.
- `scanUploadBeforeStorage()` already runs malware + CSAM scans before storage
  and returns `verdict: "blocked"` on a CSAM match.
- `isCsamSafetyConfigured()` / `trustReadinessServices().csamSafety` already
  recognize the env vars.
- `lib/__tests__/upload-safety.test.ts` already covers "requires a real CSAM
  hash matcher when CSAM safety is live" (fail-closed).
- An immutable, hash-chained audit substrate exists
  (`lib/security/audit-substrate.ts`: `appendAuditChainEvent`, Merkle proofs,
  notary anchors) — the report hook should append to this, not invent new audit
  storage.

### Out of scope

- Choosing/contracting the hash-matching vendor (legal — see decisions).
- Flipping `CSAM_SAFETY_LIVE=1` (human gate — see decisions).
- Any human-in-the-loop review UI that would surface the asset for preview
  (explicitly forbidden by the acceptance criteria).
- Changes to `lib/version.ts`, monetization/compliance gate flags, or
  attestations (forbidden by task rules).

## Sub-task checklist

- [ ] **[H/legal]** Select hash-matching vendor (PhotoDNA / Thorn Safer) and
      execute the agreement; establish the NCMEC (US) and/or NCECC (Canada)
      reporting pathway and capture the operational contact into
      `CSAM_REPORTING_CONTACT`. **Blocks all live behaviour.**
- [ ] **[A]** Set env `CSAM_HASH_MATCHER_URL` and `CSAM_REPORTING_CONTACT` in the
      target environment (Vercel project / secrets manager). Confirm
      `trustReadinessServices().csamSafety` and `isCsamSafetyConfigured()`
      recognize them via `/api/health` (no secret leakage).
- [ ] **[A]** On a CSAM match, in addition to today's block: **preserve** the
      asset + metadata (legal-hold path, not the normal user-visible store),
      **trigger the report hook** to `CSAM_REPORTING_CONTACT`, and append an
      **immutable audit record** via `appendAuditChainEvent` — **never expose
      the asset bytes for human preview**. The audit record carries the sha256,
      verdict, matcher response reason, reporting-contact, and timestamp only.
- [ ] **[A]** Smoke test with vendor-provided test hashes: extend
      `lib/__tests__/upload-safety.test.ts` with a mocked matcher returning a
      `csam` verdict asserting block + report-hook invocation + audit append,
      and a clean-hash case. No real CSAM content ever enters tests/fixtures.
- [ ] **[H]** Flip `CSAM_SAFETY_LIVE=1` (human/legal sign-off).
- [ ] **[A]** Post-flip monitoring + report-delivery confirmation: alert on
      `csam: "error"` (fail-closed but blocking uploads) and confirm report
      delivery receipts from the vendor/clearinghouse.

## Decisions required before implementation (human / architecture / counsel)

1. **Vendor + legal pathway (counsel).** PhotoDNA vs Thorn Safer; jurisdiction(s)
   for mandatory reporting (NCMEC US, NCECC Canada, or both); whether the
   product's user base triggers a statutory reporting duty and on what timeline.
   Determines the matcher contract, the report payload shape, and retention
   obligations.
2. **Preservation / legal-hold store (architecture + counsel).** Where blocked
   assets are preserved, for how long, under what access controls, and who (if
   anyone) is legally permitted to access them. The "no human preview" rule means
   preservation must be write-only from the app's perspective; access is a legal
   process, not a product feature.
3. **Report hook delivery mechanism (architecture).** Direct vendor API vs an
   internal queue/outbox with retry and delivery receipts. Must be durable and
   idempotent so a transient failure never drops a mandated report.
4. **Audit immutability guarantees (architecture).** Confirm the existing
   hash-chain + notary anchor in `audit-substrate.ts` meets the evidentiary bar
   for CSAM reporting, or whether an external anchor is required.
5. **Gate flip ownership (human).** Who signs off on `CSAM_SAFETY_LIVE=1` and
   what runbook/monitoring must be green first.

## First safe slice (agent-doable, no live behaviour, in juge.ca)

Land the **report-hook + immutable-audit plumbing behind the existing
fail-closed gate**, fully covered by mocked tests, so flipping the live flag
later is the only remaining action:

1. Add a small `reportCsamMatch()` helper (e.g. `lib/trust/csam-report.ts`) that,
   given `{ sha256, reason, reportingContact }`, (a) appends an immutable audit
   record via `appendAuditChainEvent` and (b) invokes the report hook. It must
   **never receive or log the asset bytes** — sha256 + metadata only.
2. Call it from the CSAM-blocked branch of `scanUploadBeforeStorage()` /
   `csamScan()` so a `blocked` verdict deterministically produces audit + report.
3. Extend `lib/__tests__/upload-safety.test.ts` with the test-hash match case
   (mocked matcher → block → audit append + report-hook called) and a clean case.
4. Keep `release-readiness.ts` unchanged except for verification; do **not** flip
   any flag or attestation.

This slice is safe because everything stays gated by `CSAM_SAFETY_LIVE` +
`CSAM_HASH_MATCHER_URL`: with the flag off / matcher unconfigured the new path is
inert, and the existing fail-closed behaviour is preserved.

## Acceptance (from the issue)

A test-hash match blocks + reports per the legal pathway; the audit record is
immutable; `release-readiness` reports the CSAM signal green in the target
environment.
