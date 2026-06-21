# Plan — Issue #481: [meta-epic] Mobile apps (iOS + Android) via Capacitor

> **Mode:** PLAN (epic / human-gated). This is a planning artifact only — **do not** start
> a full mobile build from it. The deliverable for this issue is this document plus the
> human/architecture/counsel decisions it surfaces.

> **Note on repository scope.** Issue #481 is filed in the `juge.ca` product repository, and
> the mobile shell is built there (it reuses ~95% of that Next.js workspace). This document
> records the plan from the perspective of the `annoncedenounce.com` operating repo so the
> epic has a tracked PR and the cross-repo dependencies are explicit. **No mobile/Capacitor
> code is added to this static-site repo.** The implementation lands in `juge.ca` once the
> gating decisions below are resolved.

## 1. Scope

Deliver two native store apps — **Juge.ca (QC, FR-first)** and **Judge911 (US, EN-first)** —
from one codebase using **Capacitor in hybrid/remote mode**: the native shell loads the live
`juge.ca` / `judge911.com` server and adds native plugins only for the device surface
(camera/scanner, push, biometric, secure offline, deep links, PDF).

### Why Capacitor hybrid/remote (the constrained choice)
- The product is a 40+ component authenticated workspace with OCR (`tesseract.js`),
  PDF (`pdfjs-dist` / `pdf-lib`), a marketplace, and an edition resolver. Capacitor reuses
  that web surface; Expo/React Native would re-implement every workspace tab.
- Hybrid/remote mode keeps the **#74 invariant honest**: no privileged HTML or session
  ships inside the IPA/APK. The bundle is a thin shell; the live server stays authoritative.
- **Two listings, one repo via build flavors.** Editions resolve from `NEXT_PUBLIC_EDITION`
  **at build time** — never a runtime in-app switcher, which would risk a QC↔US data leak.

### Explicitly out of scope
- Any runtime edition switcher inside a single app build.
- Shipping privileged HTML, secrets, or a session token inside the app bundle.
- A default offline cache. Offline (#476) is a deliberate, biometric-gated, OS-keychain
  encrypted, opt-in exception — not a default behavior.
- Native rewrites of workspace tabs / the edition resolver.

## 2. Sub-task checklist (child epics)

Tracked against the `juge.ca` mobile epics. Each carries `[A]` (agent-delegatable) and
`[H]` (human/counsel) work; the `[H]` reviews must start in parallel, not at the end.

- [ ] **#471 — Foundation & Capacitor shell (hybrid/remote).** Add Capacitor, configure
      `server.url` to the live edition host, allowlist, App Transport Security / cleartext
      policy, splash/icon scaffold, smoke build for both platforms. `[A]` shell · `[H]` sign
      off the remote-load + allowlist posture.
- [ ] **#472 — Edition-aware app identity.** Build flavors keyed off `NEXT_PUBLIC_EDITION`;
      separate bundle IDs / app IDs, names, icons, server URLs for Juge.ca vs Judge911.
      No runtime switch. `[A]` flavor plumbing · `[H]` confirm bundle-ID + store-account split.
- [ ] **#473 — Auth (biometric + magic-link deep-link return).** Native biometric unlock;
      magic-link returns via universal/app link into the authenticated session. Ties #103.
      `[A]` plugin + return handling · `[H]` session-lifetime & biometric fallback policy.
- [ ] **#474 — Evidence capture (camera / scanner / on-device OCR, honoring #74).** Native
      capture → secure upload to the server hashing/custody pipeline; **no privileged binary
      retained on device** beyond the in-flight capture. `[A]` capture+upload · `[H]` custody
      / retention review.
- [ ] **#475 — Push notifications (new channel on the #414 rails).** Deadline / appointment /
      hearing reminders as a push channel layered on the existing notification system.
      `[A]` channel + token registration · `[H]` consent + content-sensitivity review.
- [ ] **#476 — Secure offline access (encrypted, biometric-gated; the deliberate #74
      exception, resolves #74).** Opt-in, OS-keychain-encrypted, biometric-gated local cache.
      **Requires founder + counsel sign-off before any code.** `[H]` is the gate here.
- [ ] **#477 — Document & PDF viewing + annotation.** Native-grade PDF view + annotation
      reusing `pdfjs-dist` / `pdf-lib`. `[A]` viewer · `[H]` annotation provenance review.
- [ ] **#478 — Deep linking & universal links.** Apple Universal Links + Android App Links;
      `apple-app-site-association` / `assetlinks.json` per edition host. `[A]` config · `[H]`
      domain-ownership + association-file hosting decision (cross-repo: served by web).
- [ ] **#479 — App store presence.** Listings, privacy nutrition labels / Data Safety form,
      ratings, **legal-app review** (UPL / "information not advice" posture in store copy).
      Mostly `[H]` (counsel + store accounts).
- [ ] **#480 — CI/CD, crash reporting, analytics, accessibility.** Per-flavor build pipeline,
      signing, crash + analytics SDK (privacy-reviewed), WCAG 2.2 AA on native chrome.
      `[A]` pipeline · `[H]` analytics/crash data-flow review.

## 3. Decisions required before build (human / architecture / counsel)

These are the gates. **No child epic ships until its gate clears.**

### Human / founder
1. **Store accounts & legal entity.** Who owns the Apple Developer + Google Play accounts for
   each edition (single org vs two)? Determines bundle-ID namespace and tax/banking setup.
2. **Budget & timeline confirmation.** Capacitor "ships in weeks" assumes hybrid/remote and
   no native tab rewrites — confirm that constraint holds.

### Architecture
3. **Remote-load security posture (#471).** Exact `server.url`, navigation allowlist, and
   cleartext/ATS policy per edition. Confirm no privileged asset is ever in-bundle (#74).
4. **Universal/App Link hosting (#478).** `apple-app-site-association` and `assetlinks.json`
   must be served by the **web** edition hosts. Confirm which repo/deploy owns those files and
   the signing-fingerprint provenance (cross-repo dependency on juge.ca / judge911 web).
5. **Edition isolation at build time (#472).** Verify build flavors cannot cross-link QC↔US
   hosts; one signing identity per edition; CI matrix enforces the split.
6. **Push channel design (#475).** How push layers on the existing #414 notification rails
   without duplicating delivery state.

### Counsel / compliance (start now, in parallel)
7. **Offline cache exception (#476).** The single largest legal decision: any on-device
   retention of matter data needs explicit founder + counsel sign-off, documented as a
   deliberate, scoped exception to #74. Until signed, #476 stays design-only.
8. **App-store legal posture (#479).** Store copy and in-app surfaces must preserve the
   "legal information, not advice / no fabricated statutes-citations-forms-fees / jurisdiction-
   honest" guardrail. Counsel review of listing text and the legal-app review checklist.
9. **Privacy labels / Data Safety (#479, #480).** Counsel-reviewed data-flow map for evidence
   upload, push tokens, crash/analytics SDKs before submission.
10. **Biometric & session policy (#473).** Lockout, fallback, and session-lifetime rules
    reviewed against the platform's auth and minimization principles.

> Per the Operating Canon, changes touching auth, evidence, privacy, and publication rules
> require human/legal review before merge. Agents prepare; they do not set the legal posture.

## 4. First safe slice

The smallest correct, reversible, fully-reviewable first increment — **landing in the
`juge.ca` repo, not here** — is **part of #471 only**:

1. Add Capacitor as a dev dependency and `capacitor.config.ts` configured for **hybrid/remote
   mode** pointing at the existing live edition host (no new server behavior).
2. Generate the iOS + Android project scaffolds; **do not** ship any privileged HTML or
   session into the bundle (verify against #74 with a bundle-contents check).
3. A documented smoke build for both platforms that loads the live site read-only.

That slice is purely additive scaffolding, introduces no new data path, and is gated by
decision **#3 (remote-load posture)**. Everything else waits on its gate above.

## 5. Cross-repo note

- **This repo (`annoncedenounce.com`)** carries this plan and the tracking PR only.
- **`juge.ca`** is where the Capacitor shell, build flavors, and native plugins are
  implemented, against epics #471–#480.
- The universal/app-link association files (#478) are a shared dependency served by the web
  edition hosts and must be coordinated across both repos.

## 6. References

- `juge.ca` `docs/BEYOND_MVP_ROADMAP.md` §3 (Mobile apps) and §4 (security findings #74, #469).
- Issue #481 (meta-epic) and children #471–#480.
- `#74` (no privileged local data), `#103` (auth/magic-link), `#414` (notification rails).
- Operating Canon: human/legal review gate for auth/evidence/privacy/publication changes.
