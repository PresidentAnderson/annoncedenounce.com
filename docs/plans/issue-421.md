# Plan — Issue #421: Go-live Google OAuth + Drive import (child of #411)

Refs #421 · Part of #411 · config-flag tracker #58

## TL;DR / Status

This issue targets the **juge.ca application** (Next.js app with `lib/trust/release-readiness.ts`,
`lib/version.ts`, Google OAuth + Drive import pipeline). The repository this PR is opened against —
`annoncedenounce.com` — is the **static marketing/landing site** (`index.html`, `privacy.html`,
`robots.txt`, `sitemap.xml`, `vercel.json`). It contains **none** of the application code, env
plumbing, trust gate, or import pipeline referenced by the issue.

Because the implementation surface does not exist in this repo, no production code change can be made
here safely. This document is the deliverable: it scopes the work, lists the concrete sub-tasks,
flags the human / architecture / counsel decisions, and defines the first safe slice — so the work
can be executed in the correct repository (`PresidentAnderson/juge.ca`).

## Repository mismatch (blocker — read first)

- Worktree repo: `PresidentAnderson/annoncedenounce.com` (static site).
- Issue #421 lives in: `PresidentAnderson/juge.ca`.
- Evidence the app code is absent here:
  - No `lib/` directory at all; no `lib/trust/release-readiness.ts`; no `lib/version.ts`.
  - No Next.js app, no API routes for OAuth/Drive, no import pipeline.
  - The only matches for "oauth"/"drive" in this repo are incidental English words
    ("issue-driven", "drive a … agent loop").
- The `node_modules` symlink in setup points at `juge.ca/node_modules`, confirming the intended
  codebase is juge.ca, not this static site.

**Required human action:** route this issue's implementation to the `juge.ca` repository (or
re-point the autonomy worktree there). Everything below assumes execution against juge.ca.

## Scope

Ship Google OAuth (consent → token → refresh → revoke) and a Drive file list/read path wired into
the existing import pipeline, gated behind `lib/trust/release-readiness.ts`, using env:
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

**Acceptance (from the issue):** a user connects Drive and imports a file end-to-end; tokens
refresh; revoke works.

In scope:
- OAuth 2.0 Web flow + token lifecycle (issue, refresh, revoke).
- Minimal Drive scope; Drive file list + read into the import pipeline.
- Release-readiness recognition of the three env vars; safe gate behavior when unset.
- Post-flip monitoring hooks.

Out of scope:
- Google Cloud console configuration and consent-screen / domain verification (human + Google).
- Flipping any monetization/compliance gate flag or attestation.
- Changes to `lib/version.ts`.

## Sub-task checklist

- [ ] [H] Google Cloud project → OAuth 2.0 Web client → consent screen
      (scope `drive.readonly` or `drive.file`) → publish.
- [ ] [A] Set env `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
      in the deploy environment; confirm `lib/trust/release-readiness.ts` recognizes them and the
      gate reports ready only when all three are present and non-empty.
- [ ] [A] Implement OAuth flow: authorize URL builder (consent + `access_type=offline`,
      `prompt=consent` to guarantee a refresh token), callback handler that exchanges the code,
      and secure server-side persistence of access + refresh tokens.
- [ ] [A] Token refresh: refresh on expiry with clock-skew margin; handle `invalid_grant`
      (force re-consent) without leaking errors to the client.
- [ ] [A] Drive integration: list files (paginated) and read a chosen file, feeding bytes/metadata
      into the existing import pipeline; smoke test list+read end-to-end.
- [ ] [A] Scope minimization: request the narrowest scope that satisfies import
      (prefer `drive.file` if the picker model allows; otherwise `drive.readonly`).
- [ ] [A] Revoke path: call Google token revocation endpoint and purge stored tokens; expose a
      user-facing "Disconnect Drive" action.
- [ ] [H] Production consent-screen verification / domain verification for the requested scopes.
- [ ] [A] Post-flip monitoring: log/metric on connect success/fail, refresh failures, revoke,
      and import outcomes; alert thresholds.

## Decisions required (human / architecture / counsel)

- **[H/Google]** Consent-screen publishing + domain/scope verification (cannot be automated;
  Google review). `drive.readonly` and `drive.file` are sensitive/restricted scopes and may
  require a security assessment depending on user count.
- **[Architecture]** Token storage: which datastore, encryption-at-rest strategy, and per-user
  key scoping. Must avoid storing refresh tokens in client-accessible storage.
- **[Architecture]** Scope choice: `drive.file` (least privilege, requires Google Picker UX) vs
  `drive.readonly` (broader, simpler programmatic listing). Affects UX and verification burden.
- **[Counsel/Compliance]** Privacy-policy + data-handling disclosures for Drive access; ensure the
  existing privacy page reflects Google API Services User Data Policy ("Limited Use") commitments.
- **[Compliance gate]** Do NOT flip release-readiness/compliance attestations as part of this work;
  the gate should flip only after the human verification steps above are complete.

## First safe slice

1. In `juge.ca`, add recognition of `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to `lib/trust/release-readiness.ts` as a not-yet-ready check
   (reports "missing" until all three are set). No flag flip; purely additive readiness reporting.
2. Add the authorize-URL builder + callback scaffold behind the gate, with tokens persisted to the
   chosen store but the feature disabled in UI until the gate is ready.
3. Land OAuth + revoke before Drive read, so the credential lifecycle is verified in isolation
   before any user data flows through the import pipeline.

This slice is reversible, additive-only, introduces no client-exposed secrets, and does not flip
any compliance gate or attestation.
