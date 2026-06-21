# Plan — Issue #474: [mobile] Evidence capture (camera, scanner, on-device OCR, secure upload)

> **Mode:** PLAN (epic / human-gated). This document is the deliverable. Do **not**
> attempt a full build from it.
>
> **Repository note:** Issue #474 and all code it touches live in the
> **`juge.ca`** Next.js app (the mobile/Capacitor product), not in this
> `annoncedenounce.com` static-site repo. This plan is committed here because the
> autonomy worktree is anchored to `annoncedenounce.com`; the implementation PRs
> it describes must be opened **against `PresidentAnderson/juge.ca`**. File paths
> below are relative to the `juge.ca` repo root.

Refs PresidentAnderson/juge.ca#474 · Parent meta-epic #481 · Cross-links #74, #418.

---

## 1. Scope

**Goal (verbatim):** Photograph/scan evidence on-device, OCR it, and upload it
straight into the right matter in Canadian-region storage — with no privileged
data ever silently landing in the browser (#74) and the server-side
malware/CSAM scan (#418) enforced on the mobile path.

**Platform decision (from #481):** Capacitor in **hybrid/remote mode** — the
native shell loads the live Next.js server; native plugins supply
camera/scanner/secure-storage. This keeps the #74 "no privileged data on device"
invariant honest because the shell does not fork the data layer.

### In scope
- Native camera + multi-page document scanner (edge detect / perspective
  correction) producing image/PDF `File`s.
- Routing captured files into the **existing** intake pipeline
  (`components/workspace/DocumentIntake.tsx` → `lib/intake/ocr.ts` →
  `lib/store/evidence-files.ts`).
- On-device OCR — reuse the existing in-browser `tesseract.js` pipeline first;
  evaluate native ML Kit / Vision as an optional accelerator only.
- Direct-to-cloud upload honoring #74 (failure → surfaced error + retry, never a
  silent IndexedDB localize).
- Offline capture queue that stores only an **encrypted pending pointer**, not
  plaintext content, and flushes on reconnect.
- File-type / size / malware guardrails reused on the mobile path
  (`lib/intake/ocr.ts` client guard + server `lib/trust/upload-safety.ts`).

### Out of scope (other children of #481)
- App identity (#471), auth/biometric (#472), push (#474-in-481 list / #414),
  general offline store (#475), PDF viewing/annotation (#476), deep links
  (#477), store presence (#478), CI/CD & crash/analytics (#479).
- The base Capacitor shell + native project scaffolding (Foundation child of
  #481). This epic **depends on** that shell existing; it does not create it.

---

## 2. What already exists (do not rebuild — reuse)

Verified by reading `juge.ca` on 2026-06-21:

| Concern | Existing asset | Status |
|---|---|---|
| Browser OCR pipeline | `lib/intake/ocr.ts` (`IntakeSource`, `IntakePage`, tesseract.js FR+EN, pdf.js, HEIC/iPhone handling, 25 MB client guard `MAX_INTAKE_FILE_BYTES`, OCR page cap) | Solid; reuse as-is |
| Intake UI / upload orchestration | `components/workspace/DocumentIntake.tsx` (calls `runIntake` then `uploadEvidence(shell.id, src.file)`; already drops unsupported/oversized files) | Reuse; add a capture entry point |
| #74-compliant upload | `lib/store/evidence-files.ts` `uploadEvidence()` — signed-in path uploads to the private `evidence` Supabase bucket and **throws on failure** (no IndexedDB fallback); IndexedDB only for anonymous local-preview | Correct; the mobile path must use this exact function |
| Server malware/CSAM scan (#418) | `lib/trust/upload-safety.ts` `scanUploadBeforeStorage(...)` (VirusTotal by sha256, CSAM hooks, fail-policy via `release-readiness.ts`); test `lib/__tests__/upload-safety.test.ts` (EICAR) | Reuse; ensure mobile uploads traverse it |
| Server ingest route | `app/api/evidence/ingest/route.ts` (UUID-validated matterId, sha256, `scanUploadBeforeStorage`, service-role) | Reference pattern for any new mobile-upload route |
| Mobile config data layer | `lib/mobile/app-config.ts` (`MobileAppConfig` derived from `lib/editions.ts`; pure TS, no native files yet) | The Capacitor config will read this |

**Anti-patterns to avoid (#74):** never write captured evidence to
`localStorage`/`IndexedDB` for a signed-in user; never swallow an upload error
into a silent local copy.

---

## 3. Sub-task checklist ([A]gent / [H]uman)

### A. Capture surface
- [ ] [A] Add a capacitor camera/scanner adapter `lib/mobile/evidence-capture.ts`
  that wraps `@capacitor/camera` (and a document-scanner plugin — see Decision D1)
  and returns standard `File[]` compatible with `runIntake`. Web fallback =
  existing `<input type=file capture>`.
- [ ] [A] Add a "Scan / Photograph" entry point to `DocumentIntake.tsx` gated on
  `Capacitor.isNativePlatform()`; on web it stays the current file picker.
- [ ] [A] Multi-page document scanner: collect N pages → one PDF (reuse
  `pdf-lib`, already a dep) before handing to intake, so OCR/extraction sees one
  coherent source.

### B. OCR
- [ ] [A] Route captured images/PDFs through the existing `lib/intake/ocr.ts`
  unchanged (tesseract.js, FR+EN). Confirm HEIC capture is converted to a
  JPEG/PNG the OCR path can read (the current pipeline stores HEIC without OCR).
- [ ] [A] (Optional, behind a flag) Native ML Kit (Android) / Vision (iOS)
  text-recognition adapter implementing the same `IntakeSource` contract, used
  only when available; tesseract.js remains the canonical fallback. Decision D2.

### C. Secure upload (#74)
- [ ] [A] Mobile capture path calls the existing
  `uploadEvidence(matterId, file)` — no new local store. On failure surface the
  error + offer retry (mirror current `DocumentIntake` error UX).
- [ ] [A] Confirm the upload still hits the server-side scan: either keep the
  direct-to-bucket browser upload (scan runs on the existing
  ingest/verification path) **or** route mobile uploads through a scanned
  server route. Decide in Decision D3.

### D. Offline capture queue (encrypted pointer only)
- [ ] [A] Queue model: when offline, persist **only** `{ matterId, localFileRef,
  sha256, createdAt }` where `localFileRef` points at OS-encrypted app-sandbox
  storage (e.g. `@capacitor/filesystem` `Directory.Library` + device
  encryption), and the queue index itself lives in
  `@capacitor/preferences`/secure storage — **never** plaintext evidence bytes in
  web `localStorage`/`IndexedDB`.
- [ ] [A] Flush-on-reconnect worker: on `navigator.onLine` / Capacitor `Network`
  resume, drain the queue through `uploadEvidence`, then delete the local
  encrypted blob. Failed flush → keep queued + surface, never silently drop.
- [ ] [A] Cap queue size/age; expose pending count in the UI.

### E. Guardrails (reuse #418 / `upload-safety`)
- [ ] [A] Apply the existing client guard (`MAX_INTAKE_FILE_BYTES`, supported
  types) to captured files before queueing/upload.
- [ ] [A] Extend `lib/__tests__/upload-safety.test.ts` (or a sibling) to cover
  the mobile upload entry so EICAR is rejected and a clean capture passes on the
  mobile path too.

### F. Compliance
- [ ] [H] Confirm Supabase Storage region = Canada and the DPA explicitly covers
  mobile capture (Decision D4).

---

## 4. Human / architecture / counsel decisions required

- **D1 — Document-scanner plugin (architecture/[H]):** choose the scanner
  (e.g. `@capacitor-mlkit/document-scanner`, a community Capacitor scanner, or a
  native bridge). Criteria: edge-detect + perspective quality, license,
  maintenance, iOS+Android parity, no telemetry leaking document content.
- **D2 — On-device OCR engine (architecture):** tesseract.js-only vs. native ML
  Kit/Vision accelerator. Default to tesseract.js (already shipping, deterministic,
  no extra native dep); native is an optional perf path, not a requirement.
- **D3 — Upload scan placement (architecture + security):** keep direct-to-bucket
  browser upload (scan on the existing verification path) vs. force mobile
  uploads through a scanned server route. Must guarantee #418
  `scanUploadBeforeStorage` runs **before** evidence is durably persisted on the
  mobile path. Do not flip `UPLOAD_SCANNING_*` flags as part of this work.
- **D4 — Data residency + privilege (counsel/[H]):** written confirmation that
  the evidence bucket is Canada-region and the DPA/Loi 25 + solicitor-client
  privilege posture covers device-side capture and any transient on-device
  encrypted queue (retention, key handling, remote-wipe on logout).
- **D5 — Offline key management (security):** what encrypts the offline pending
  blob (OS keychain/keystore via secure storage vs. app-managed key), and the
  wipe-on-logout / wipe-on-uninstall guarantees.

> Constraint per repo HARD RULES: do **not** edit `lib/version.ts`, do **not**
> flip monetization/compliance gate flags or attestations, and keep any DB
> migrations additive-only with the next free number.

---

## 5. First safe slice (smallest shippable, no native scanner yet)

Goal: prove the capture→intake→#74-upload wiring with zero new compliance risk
and a clean web fallback, before any scanner/OCR-engine decision is finalized.

1. Add `lib/mobile/evidence-capture.ts`: a thin adapter exposing
   `captureEvidence(): Promise<File[]>`. Native branch uses `@capacitor/camera`
   single-photo capture; non-native branch returns `[]` so callers fall back to
   the existing file picker. Pure TS contract + unit-testable, no native project
   changes required to land it.
2. Wire one "Take photo" affordance in `DocumentIntake.tsx`, visible only when
   `Capacitor.isNativePlatform()`, that feeds captured `File`s into the existing
   `runIntake` → `uploadEvidence` flow (reuses OCR + #74 upload unchanged).
3. Add a focused test asserting the captured-file path still enforces the
   client size/type guard and still calls `uploadEvidence` (i.e. no local-store
   regression).

This slice introduces **no** offline queue, **no** new server route, **no**
scanner plugin, and **no** flag flips — so it is reviewable in isolation and
defers every D-decision above. Multi-page scanner, native OCR, and the encrypted
offline queue follow as separate PRs once D1–D5 are resolved.
