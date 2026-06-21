# Plan — Issue #480: [mobile] CI/CD, crash & analytics, accessibility

**Mode:** PLAN (epic, human-gated). This document is the deliverable. Do **not** build the
feature in this PR.

## Context

Issue #480 is a mobile epic in the `juge.ca` lineage. Its goal: automated signed builds,
crash/analytics visibility, and verified mobile accessibility. This repository
(`annoncedenounce.com`) is the static launch site that shares the same Sovereign Autonomy
operating canon (`docs/OPERATING_CANON.md`, `canon.lock.yaml`) and the same version policy
(`lib/version.ts` in the app lineage; `version.json` + `package.json` here). Because the
mobile app and this site share canon, governance for the mobile pipeline must be designed
once and applied consistently. This plan scopes that work and records the decisions that
must be made by humans (legal/architecture/release) before any build slice ships.

## Goal (restated)

1. Automated **signed builds** per edition → TestFlight / Play internal.
2. **Mobile CI** that is fully separate from the web Vercel deploy lineage.
3. **Crash reporting + analytics** bridged through the existing `ErrorReporter`, with no
   privileged-data leakage.
4. Verified **mobile accessibility** (VoiceOver/TalkBack, dynamic type, focus order, RTL).
5. **Mobile E2E** through the existing Momentic mobile skill on iOS + Android.
6. **Signing assets** managed in a secret store, never in the repo.

## Hard constraints (carry into every slice)

- Never edit `lib/version.ts`; the mobile build reads the version, it does not author it.
- Never flip monetization / compliance gate flags or attestations.
- Migrations additive-only, next free number.
- Mobile CI must **not** race the Codex/CLI web lineage or the Vercel deploy (separate
  workflow, separate concurrency group, separate triggers).
- Signing secrets (Apple certs/profiles, Android keystore, store API keys) live only in a
  secret store / CI secrets — never committed, never echoed in logs.
- Changes touching auth, evidence, moderation, legal/privacy/right-of-reply/takedown rules
  require human/legal review before merge (per OPERATING_CANON §"Sovereign Autonomy Rules").

## Sub-task checklist

### A. CI/CD — signed builds
- [ ] Add a dedicated mobile CI workflow (e.g. `.github/workflows/mobile-ci.yml`) with its
      own `concurrency.group` distinct from `ci-*` and from the autonomy loop, triggered on
      mobile-relevant paths/tags only (not on web-only changes).
- [ ] Define Fastlane (or EAS-equivalent) lanes **per edition**: `build_signed`,
      `beta_ios` (TestFlight), `beta_android` (Play internal).
- [ ] Inject the build/version number from the app's `lib/version.ts` (read-only) so store
      builds stay in lockstep with the canonical version — do not duplicate or hardcode it.
- [ ] Wire CI secrets references (no values) and document the required secret names.
- [ ] Gate store upload lanes behind a manual approval / protected environment so an agent
      cannot ship to TestFlight/Play without a human.

### B. Crash reporting & analytics
- [ ] Choose crash backend (Sentry vs Crashlytics) — see decision D2.
- [ ] Bridge the chosen SDK through the existing `ErrorReporter` abstraction so call sites
      are unchanged and the backend stays swappable.
- [ ] Add analytics with a strict allow-list of event fields; assert **no** privileged data
      (PII, evidence content, matter identifiers, auth tokens) is ever emitted.
- [ ] Add a redaction/scrubbing layer + a test that fails if a disallowed field appears.

### C. Accessibility
- [ ] a11y labels for VoiceOver (iOS) and TalkBack (Android) on the sign-in → matter →
      document flow.
- [ ] Dynamic type / font scaling support without layout breakage.
- [ ] Deterministic focus order on each screen.
- [ ] RTL correctness for `ar` and `he` (mirroring, alignment, icon direction).
- [ ] Manual screen-reader pass checklist + automated a11y assertions where the toolkit
      supports them.

### D. Mobile E2E
- [ ] Author Momentic mobile flows (auth → capture → upload → push) using the existing
      `momentic-mobile-test` skill.
- [ ] Run on iOS and Android targets in the mobile CI workflow (not the web CI).
- [ ] Keep E2E credentials in the secret store; use throwaway/fixture test accounts only.

### H. Signing assets (human-owned)
- [ ] Stand up the secret store entries for Apple certs/profiles and the Android keystore.
- [ ] Rotate any key/cert that may have been exposed; confirm nothing signing-related is in
      git history.

## Decisions required before building (human / architecture / counsel)

- **D1 (architecture/release):** Fastlane vs EAS, and where mobile CI runs (GitHub Actions
  vs EAS cloud). Must guarantee non-interference with the web Vercel/Codex lineage.
- **D2 (architecture + privacy/counsel):** Sentry vs Crashlytics. Requires a privacy/legal
  review of the data each ships off-device, against the platform's private-data-minimization
  principle, before either is enabled in a real build.
- **D3 (counsel):** Analytics event taxonomy + retention. The platform is evidence-first and
  allegation-safe; analytics must not leak matter/evidence/identity data. Counsel signs the
  allow-list.
- **D4 (security/ownership):** Which secret store (GitHub Environments + secrets, 1Password,
  cloud KMS) holds signing assets, and who holds break-glass access. Agents prepare; a human
  owns the keys (issue child [H]).
- **D5 (release):** Store account / bundle-id / edition mapping and who approves promotion
  from internal track to production.

## First safe slice (no secrets, no store access, no app-code changes)

Ship the **CI scaffold only**, fully inert until a human supplies secrets:

1. Add `.github/workflows/mobile-ci.yml` that:
   - has its own `concurrency.group` (e.g. `mobile-ci-${{ github.ref }}`), separate from
     `ci-*` and the autonomy loop;
   - triggers only on mobile paths/tags (so it never races the web deploy);
   - runs lint + the mobile a11y/static checks that need no signing material;
   - declares store-upload steps but guards them behind a protected environment +
     `if:` on a secret being present, so they are no-ops until D4 is resolved.
2. Add a `docs/mobile/ci-secrets.md` stub listing the **names** (not values) of every
   secret the lanes will reference, pointing to decision D4.

This slice changes only CI/docs, references the canonical version read-only, leaks no
secrets, and cannot deploy anything — so it is safe to land without the human gates above.
Subsequent slices (Fastlane lanes, crash/analytics SDK wiring, E2E) land only after the
corresponding decisions (D1–D5) are signed off.

## Out of scope for this PR

Any actual mobile build, SDK install, store upload, secret provisioning, or app source
change. Those are tracked as the checklist items above and unlocked by D1–D5.

Refs #480
