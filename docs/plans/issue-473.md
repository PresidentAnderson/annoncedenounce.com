# Plan — Issue #473: [mobile] Auth — biometric + magic-link deep-link return

**Status:** PLAN (epic / human-gated — no feature build in this PR)
**Refs:** #473
**Owner gate:** Human + architecture + legal/counsel review required before any code merges (see OPERATING_CANON "Sovereign Autonomy Rules").

---

## 0. Repository-fit note (read first)

`annoncedenounce.com` is currently a **static launch site** (HTML + Vercel + a thin
`/api/version` handler). It has **no mobile app, no auth backend, no TypeScript app code,
and no database/migrations** in-tree. The mobile auth surface described by this issue does
not exist here yet.

Per `docs/OPERATING_CANON.md`, the reference implementation patterns for this product come
from **`juge.ca`**. This plan is therefore written as the architecture/sequencing plan for
landing the feature against that reference stack, with the launch site only contributing the
public-facing deep-link/Universal-Link assets it can legitimately host. No auth logic,
secrets, or gate flags are introduced by this PR — only this document.

Because auth touches the canon's protected surfaces (authentication, privacy, private-data
minimization), **agents may prepare the work but must not decide the security or legal
posture.** That decision is explicitly deferred to humans below.

---

## 1. Scope

Deliver mobile sign-in for the Annonce Denonce app with two coordinated flows:

1. **Magic-link with deep-link return** — user requests a sign-in email, taps the link, and
   is returned *into the app* (not a stray browser tab) with the session established, even
   if the link is opened on a different device or after the app was killed.
2. **Biometric unlock** — after a first successful authentication, the device can re-unlock
   the existing session with platform biometrics (Face ID / Touch ID / Android
   BiometricPrompt), gated behind hardware-backed secure storage.

### In scope
- Magic-link request endpoint + single-use, short-TTL, signed token issuance.
- Deep-link / Universal Link / App Link routing back into the app and session handoff.
- Cross-device and cold-start handling (link opened where the app may not be installed).
- Biometric enrollment + unlock layered **on top of** an existing session, not as a
  replacement for primary auth.
- Secure token-at-rest storage (Keychain / Keystore via secure-store abstraction).
- Telemetry + auditability for auth events (canon requires auditable decisions).

### Out of scope (explicitly)
- Password auth, social login, SSO — not part of this issue.
- Account recovery / device-loss recovery policy beyond what magic-link already implies
  (separate issue; flagged as a counsel decision).
- Any change to monetization / compliance gate flags, attestations, or `lib/version.ts`.
- Any migration in this PR (none needed for a plan; future migrations are additive-only
  with the next free number).

---

## 2. Sub-task checklist (concrete)

### A. Deep-link / Universal Link foundation
- [ ] Reserve the auth return path (e.g. `/auth/return`, `/auth/m/:token`) and document the
      canonical URL shape.
- [ ] Publish `apple-app-site-association` (AASA) and Android `assetlinks.json` for the
      app's domain. **This launch repo can host these static well-known assets** under
      `/.well-known/` once the app's Team ID / package SHA-256 are provided.
- [ ] Verify Universal Links / App Links open the app (not Safari/Chrome) on a real device.
- [ ] Define the in-app deep-link router entry and the "open in app" interstitial for the
      not-installed / wrong-device case.

### B. Magic-link issuance + verification (server / juge.ca stack)
- [ ] Token model: opaque random ID + server-side record (or signed JWT) — decide which
      (see §3, architecture decision).
- [ ] Single-use enforcement, short TTL (target 10–15 min), one-active-link-per-request,
      and invalidation of prior links on re-request.
- [ ] Bind token to the requesting context where safe (email + intent), without breaking
      legitimate cross-device opens — document the tradeoff explicitly.
- [ ] Rate-limit + abuse throttling on the request endpoint (per email, per IP).
- [ ] Email template (allegation-safe, no sensitive content in the email body).
- [ ] Exchange endpoint: token -> session, with replay protection and audit log entry.

### C. Session handoff into the app
- [ ] On deep-link open, exchange token for a session and persist securely.
- [ ] Cold-start handling: app launched *by* the link resolves auth before first render.
- [ ] Already-signed-in handling and account-mismatch handling.
- [ ] Clear, allegation-safe error states (expired / already-used / wrong-device link).

### D. Biometric unlock
- [ ] Secure storage abstraction (Keychain / Keystore) for the refresh/session material.
- [ ] Enrollment opt-in flow after first successful sign-in (never forced).
- [ ] `BiometricPrompt` / `LAContext` unlock path with passcode fallback.
- [ ] Invalidate biometric-bound material on biometric set change (iOS
      `kSecAccessControlBiometryCurrentSet` / Android key invalidation on enrollment change).
- [ ] Lockout / fallback-to-magic-link after N failed biometric attempts.

### E. Safety, audit, and tests
- [ ] Audit events for: link requested, link consumed, session established, biometric
      enrolled, biometric unlock, biometric failure/lockout.
- [ ] Private-data minimization review of every logged/stored field.
- [ ] Unit tests: token lifecycle (issue/expire/replay/single-use), exchange.
- [ ] Integration/E2E: full magic-link round trip + cold-start, biometric enroll + unlock.
      (A Momentic mobile flow is the likely vehicle; see `momentic-mobile-test` skill.)
- [ ] Threat-model sign-off recorded in the PR.

---

## 3. Decisions required (human / architecture / counsel)

These are deliberately **not** decided by the agent.

| # | Decision | Owner |
|---|----------|-------|
| 1 | Token model: server-side opaque token vs. signed JWT (revocation, statelessness, blast radius). | Architecture |
| 2 | Whether to allow cross-device link opens at all, or hard-bind link to originating device (security vs. UX). | Architecture + Counsel |
| 3 | Link TTL, single-use semantics, and re-request invalidation policy. | Architecture |
| 4 | Exactly which fields enter the audit log and for how long they are retained, under private-data-minimization. | Counsel |
| 5 | App identity values for AASA / assetlinks (Apple Team ID + bundle ID, Android package + signing SHA-256). | Human (release owner) |
| 6 | Email deliverability provider + DKIM/SPF posture for the magic-link sender domain. | Human (ops) |
| 7 | Biometric fallback + device-loss / account-recovery policy. | Counsel + Architecture |
| 8 | Confirmation that this work targets the `juge.ca` app stack, with this repo only hosting `/.well-known` link-association assets. | Human |

No work in sections B–D should merge until decisions 1–4 and 7 are recorded.

---

## 4. First safe slice (mergeable, no auth logic, no gate flags)

The smallest production-quality increment that is provably safe and unblocks the rest:

> **Publish the Universal Link / App Link association assets and reserve the auth return
> route shape — static, secret-free, no session code.**

Concretely, once decision #5 (app identity values) is provided by a human:
1. Add `/.well-known/apple-app-site-association` (JSON, served with the correct content type
   via `vercel.json`) describing the `/auth/*` paths.
2. Add `/.well-known/assetlinks.json` for Android App Links.
3. Extend the existing static verifier (`scripts/verify-site.mjs`) to assert both files exist
   and parse as JSON — keeping them in the verification gate like every other static asset.
4. Document the reserved auth URL shape in this repo's docs so the app and backend teams
   agree on the contract before any token code is written.

This slice introduces **no** authentication behavior, **no** secrets, and **no** gate-flag
changes — it only stands up the device-to-app link plumbing that every later step depends on,
and it stays entirely inside this repo's static-site competency. It must not ship until the
real Team ID / package SHA values are supplied (placeholders are blocked by canon).

---

## 5. Risks / notes
- Magic-link is a passwordless primary-auth mechanism; its email + token surface is the
  highest-value attack target. The token decisions in §3 are load-bearing for security.
- Biometric must remain a *re-unlock* of an existing session, never a standalone primary
  credential, to avoid weakening the auth model.
- Keep all link emails allegation-safe and free of sensitive content, per product safety
  principles.
- AASA/assetlinks must use real release identities; placeholder identities would both fail
  link verification and violate the no-placeholder canon rule.
