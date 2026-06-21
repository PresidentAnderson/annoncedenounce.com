# Plan — Set up Google Drive import (juge.ca #58)

> **Refs juge.ca#58** — `[feature] Set up Google Drive import`, labels
> `enhancement` / `config` / `area:import`.
>
> This plan cannot `Closes #58` in *this* repository: issue #58 here resolves to
> an unrelated PR, and the real issue lives in the **juge.ca** application repo.

## Why a plan, not code (repo / worktree mismatch)

The assigned issue is filed in **`PresidentAnderson/juge.ca`** and its code lives
there:

- `lib/trust/release-readiness.ts` — `isGoogleDriveImportConfigured()` readiness flag
- `components/workspace/DocumentIntake.tsx` — the upload-first intake UI
- `lib/intake/ocr.ts` — `expandFiles`, `processSource`, `IntakeSource` (browser pipeline)
- `lib/intake/engine.ts` — `buildProposal`, `applyIntake`

This worktree is checked out against **`annoncedenonce`** (annoncedenounce.com),
a 25-file static marketing site with no `lib/`, no Next.js app, no intake
pipeline, and no Google integration. The feature cannot be implemented here
without leaving the worktree, which the workflow's hard rules forbid ("touch ONLY
files relevant to this issue"; never leave the worktree). Per the workflow
fallback ("if genuinely blocked on a real implementation, STILL open a PR
carrying a plan doc so the issue has a PR"), this PR ships the plan. A maintainer
should re-run the implement workflow with a **juge.ca** worktree (or land the
slices there directly).

Everything below is grounded in the *actual* juge.ca source read during this
investigation.

## What the issue asks for

> Status panel shows Google Drive import **not set up**. Not found in
> `lib/trust/release-readiness.ts`, so likely an unbuilt integration.
> Scope: OAuth to Google Drive, file picker, pull selected files into the
> document-intake pipeline (reuse `DocumentIntake` processing). Define env/secret
> needs and the import path.

## Verified current state (juge.ca)

- **Readiness flag already wired.** `isGoogleDriveImportConfigured()` returns
  `Boolean(NEXT_PUBLIC_GOOGLE_CLIENT_ID && NEXT_PUBLIC_GOOGLE_API_KEY)` and is
  surfaced as `googleDrive` in `trustReadinessServices()`. The status panel reads
  this flag — it shows "not set up" because the two env vars are empty and **no
  UI calls the Google Picker**. The flag itself does not need changing.
- **Env keys already declared (empty) in `.env.example`:**
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`,
  `NEXT_PUBLIC_GOOGLE_API_KEY`. So this is a **wiring + provisioning** task, not a
  new-config task. No new env keys are required for the minimal Picker flow.
- **Intake is browser-side and `File`-based.** `DocumentIntake.tsx` already
  consumes `File` objects via `expandFiles(...)` → `processSource(...)` →
  `IntakeSource` → `buildProposal`/`applyIntake`. The import path therefore does
  **not** need a new pipeline — it only needs to turn Drive selections into
  `File` objects and hand them to the existing `expandFiles` entry point.
- **Migrations:** none required (intake is client-side; selected files are stored
  through the existing evidence path). If a future "remember last Drive folder"
  preference is added, the next free migration number is **`0068`**
  (last is `0067_matter_activity.sql`) — additive only.

## The import path (smallest correct design)

Reuse, do not rebuild. The Google Picker returns file IDs; download each to a
`Blob`, wrap as a `File`, then feed the existing intake pipeline:

```
[Import from Google Drive] button (in DocumentIntake upload step)
  → load gapi + Google Identity Services (token client), request scope
      https://www.googleapis.com/auth/drive.readonly  (read-only, least privilege)
  → google.picker shows the user's Drive, filtered to intake-supported MIME types
  → for each picked file: GET https://www.googleapis.com/drive/v3/files/{id}?alt=media
      with the OAuth access token → Blob → new File([blob], name, { type })
  → expandFiles(files)  // existing — also unzips archives
  → processSource(...)  // existing OCR/extraction, unchanged
  → existing review → classify → match → applyIntake flow (unchanged)
```

Google-native docs (Docs/Sheets/Slides) must use
`files.export` (e.g. export to PDF/DOCX) rather than `alt=media`; gate the Picker
to MIME types already in `DocumentIntake`'s `ACCEPT` plus the exportable Google
types, and route exportable types through `files.export`.

Respect the existing guardrail `MAX_INTAKE_FILE_BYTES` (`isSupportedIntakeFile`)
before download/append so oversized Drive files are rejected with the same
message as local uploads.

## Sub-task checklist (in juge.ca)

- [ ] Add a thin client helper `lib/intake/google-drive.ts`:
      `loadPicker()`, `requestDriveToken()`, `pickDriveFiles(): Promise<File[]>`
      (Picker + per-file download/export → `File[]`). No secrets in client code;
      uses only `NEXT_PUBLIC_GOOGLE_CLIENT_ID` + `NEXT_PUBLIC_GOOGLE_API_KEY`.
- [ ] Add an "Import from Google Drive" button to the upload step in
      `components/workspace/DocumentIntake.tsx`, shown only when both public env
      vars are present (mirror `isGoogleDriveImportConfigured` client-side); merge
      the returned `File[]` into the same array the file `<input>` produces, then
      call the existing `expandFiles`/`processSource` path.
- [ ] Filter the Picker to intake-supported MIME types; route Google-native docs
      through `files.export`; enforce `MAX_INTAKE_FILE_BYTES` per file.
- [ ] Bilingual UI strings (fr/en) via the existing `AppDict` dictionaries — do
      not hard-code; respect edition purity (no cross-edition copy).
- [ ] Unit test the helper's MIME/size filtering and the Google-native export
      branch (mock gapi/picker); extend `lib/intake/__tests__` for the
      `File[]` → `expandFiles` hand-off.
- [ ] Docs: add a short "Google Drive import" section to the README/ops doc and
      the Cloud-console setup (enable Drive API + Picker API, create OAuth client,
      authorized JS origins, API key restrictions). The `.env.example` keys
      already exist — only values/provisioning are needed.

## First safe slice (no migration, no gate flip)

Ship `lib/intake/google-drive.ts` as a **pure, dependency-light helper** plus its
unit tests, behind the existing `NEXT_PUBLIC_GOOGLE_*` env presence check, with
the `DocumentIntake` button hidden until provisioning lands. This adds the import
path without touching compliance gates, migrations, or `lib/version.ts`, and the
`googleDrive` readiness flag flips on naturally once the two public env vars are
populated in the target environment.

## Human / architecture / counsel decisions required

- **OAuth scope & verification (architecture + security):** `drive.readonly` is
  least-privilege; confirm before requesting broader scopes. A Drive-scope app
  may require Google's OAuth app-verification / security assessment — schedule
  this with the owner; it gates production go-live, not the code.
- **Cloud provisioning (human/owner):** create the OAuth client + API key, enable
  Drive API + Picker API, set authorized JavaScript origins and API-key
  restrictions, and populate `NEXT_PUBLIC_GOOGLE_CLIENT_ID` /
  `NEXT_PUBLIC_GOOGLE_API_KEY` in each environment.
- **Privacy / counsel:** importing client documents from a user's Drive touches
  privileged material — confirm the privacy notice and data-handling posture
  (files transit the browser to existing evidence storage; nothing new is
  retained by Google after download). Defer the final wording to counsel.
- **Upload scanning interaction:** confirm Drive-sourced files flow through the
  same `UPLOAD_SCANNING_*` path as local uploads before any monetized/production
  enablement.

## Hard-rule guardrails for the implementing PR

- Do **not** edit `lib/version.ts`.
- Do **not** flip monetization/compliance gate flags or attestations
  (`ATTORNEY_*`, `*_LIVE`, `UPLOAD_SCANNING_REQUIRED`, etc.); the `googleDrive`
  readiness flag flips via env presence, not code.
- Migrations additive-only with the next free number (**`0068`**) — and only if a
  persisted preference is actually added; the minimal flow needs none.
- Reuse `expandFiles` / `processSource` / `applyIntake`; do not fork the intake
  pipeline.

## Acceptance criteria (for the juge.ca PR)

- Status panel `googleDrive` reads green once the two public env vars are set.
- "Import from Google Drive" appears in `DocumentIntake` only when configured;
  picking files runs them through the existing OCR/extraction/review/apply flow
  identical to local uploads.
- Google-native docs import via export; oversized/unsupported files are rejected
  with the existing messaging; UI strings are bilingual and edition-pure.
- No changes to `lib/version.ts`, no gate-flag flips, no non-additive migrations.
