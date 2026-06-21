# Plan — Issue #471: [mobile] App foundation & Capacitor shell (hybrid/remote)

> **Mode:** PLAN (epic / human-gated). This is a planning artifact only — **do not** start a
> full mobile build from it. The deliverable for this issue is this document plus the
> human / architecture / counsel decisions it surfaces.

> **Note on repository scope.** Issue #471 is the first child of the `juge.ca` mobile
> meta-epic **#481**, and the Capacitor shell is built in the `juge.ca` product repo (it
> reuses ~95% of that Next.js workspace). This document records the plan from the
> `annoncedenounce.com` operating repo so the epic has a tracked PR and the cross-repo
> dependencies are explicit. **No mobile/Capacitor code is added to this static-site repo.**
> The implementation lands in `juge.ca` once the gating decisions below are resolved.
> The parent-level plan lives in `docs/plans/issue-481.md`; this doc drills into #471 only.

## 1. Scope

Stand up the **foundational Capacitor shell** that every later mobile epic (#472–#480)
builds on. The shell runs in **hybrid/remote mode**: the native app is a thin wrapper that
loads the live edition host (`juge.ca` / `judge911.com`) over HTTPS and adds native plugins
incrementally. #471 itself ships only the wrapper, the secure remote-load configuration, and
a reproducible smoke build for both platforms.

### In scope for #471
- Add Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`)
  as **dev / additive** dependencies in `juge.ca`.
- `capacitor.config.ts` in **hybrid/remote mode**: `server.url` → the live edition host,
  `server.cleartext: false`, an explicit navigation `allowList`, and `androidScheme: 'https'`.
- Generate the iOS (`ios/`) and Android (`android/`) native project scaffolds.
- App Transport Security (iOS) + network-security-config (Android): **HTTPS-only, no
  cleartext, no arbitrary-loads exception.**
- Placeholder splash screen and app icon scaffold (edition-neutral; real per-edition assets
  come with #472).
- A documented, reproducible **smoke build** for both platforms that loads the live site
  read-only, plus a **bundle-contents check** proving no privileged HTML / secret / session
  ships inside the IPA/APK.

### Explicitly out of scope for #471 (owned by later children)
- Edition flavors / separate bundle IDs / per-edition icons → **#472**.
- Biometric auth and magic-link deep-link return → **#473**.
- Camera / scanner / OCR evidence capture → **#474**.
- Push notifications → **#475**.
- Any offline cache or on-device matter data → **#476** (the deliberate, counsel-gated #74
  exception). #471 ships **no** offline cache and **no** default WebView caching of
  privileged responses.
- Universal / App Links and association files → **#478**.
- Store listings, privacy labels, CI/CD, crash/analytics → **#479 / #480**.
- Any runtime edition switcher (would risk a QC↔US data leak) — never.

## 2. Sub-task checklist (#471 only)

Each item is tagged `[A]` (agent-delegatable) or `[H]` (human / counsel gate). The `[H]`
review on the remote-load posture must clear **before** any `[A]` scaffolding merges.

- [ ] **`[H]` Remote-load security posture sign-off.** Approve exact `server.url`,
      `allowList`, and the HTTPS-only / no-cleartext policy per edition. **Gates everything
      below.**
- [ ] **`[A]` Add Capacitor deps.** `@capacitor/core` + `@capacitor/cli` +
      `@capacitor/ios` + `@capacitor/android`, additive, no change to existing build.
- [ ] **`[A]` Author `capacitor.config.ts`** in hybrid/remote mode (`server.url`,
      `cleartext: false`, `allowList`, `androidScheme: 'https'`); `appId`/`appName` left as a
      neutral placeholder that #472 overrides per edition.
- [ ] **`[A]` Generate native scaffolds** (`npx cap add ios`, `npx cap add android`); commit
      the generated projects per Capacitor convention.
- [ ] **`[A]` Lock transport security.** iOS `Info.plist` ATS = HTTPS-only (no
      `NSAllowsArbitraryLoads`); Android `network_security_config.xml` `cleartextTrafficPermitted="false"`.
- [ ] **`[A]` Splash + icon scaffold** (edition-neutral placeholder via `@capacitor/assets`).
- [ ] **`[A]` Smoke build + bundle-contents check.** Document the build commands for both
      platforms and a check that the bundle contains **no** privileged HTML, secret, or
      session token (#74 verification).
- [ ] **`[H]` #74 invariant confirmation.** Reviewer confirms the bundle-contents check
      output and that no privileged asset is in-bundle before the shell is accepted.

## 3. Decisions required before build (human / architecture / counsel)

These are the gates. **#471 does not ship until its gates clear.**

### Architecture
1. **Remote-load security posture (the core #471 decision).** Exact `server.url`, the
   navigation `allowList` (which hosts the WebView may navigate to), and the cleartext / ATS
   policy. Default position: HTTPS-only, allowlist = the single edition host + required auth
   redirect domains, no arbitrary loads.
2. **WebView caching posture.** Confirm the shell does **not** persist privileged responses
   to the WebView disk cache (keeps #74 honest until #476 designs the deliberate exception).
3. **Capacitor version + native-project commit policy.** Pin a Capacitor major; decide
   whether generated `ios/` and `android/` projects are committed (recommended) or
   regenerated in CI.
4. **Placeholder `appId` / `appName` ownership.** #471 uses a neutral placeholder; confirm
   the namespace so #472's per-edition bundle IDs slot in cleanly.

### Human / founder
5. **Repo landing confirmation.** Confirm the shell lands in `juge.ca` (not this repo) and
   which branch/owner drives it.

### Counsel / compliance (start in parallel)
6. **#74 no-privileged-local-data invariant.** Counsel/architecture confirm the
   bundle-contents check and the no-default-offline-cache posture satisfy #74 for the shell.
   (The *exception* to #74 is #476's separate, signed decision — not #471's.)

> Per the Operating Canon, changes touching auth, evidence, privacy, and publication rules
> require human / legal review before merge. Agents prepare; they do not set the legal posture.

## 4. First safe slice

The smallest correct, reversible, fully-reviewable first increment — **landing in the
`juge.ca` repo, not here** — is:

1. Add Capacitor as a dev dependency and a `capacitor.config.ts` configured for
   **hybrid/remote mode** pointing at the existing live edition host (no new server
   behavior, HTTPS-only, explicit `allowList`).
2. Generate the iOS + Android scaffolds; **do not** ship any privileged HTML or session into
   the bundle — verify with a bundle-contents check (#74).
3. A documented smoke build for both platforms that loads the live site read-only.

That slice is purely additive scaffolding, introduces no new data path, and is gated by
decision **#1 (remote-load posture)**. Plugins, flavors, auth, and offline all wait on their
own child epics and gates.

## 5. Cross-repo note

- **This repo (`annoncedenounce.com`)** carries this plan and the tracking PR only.
- **`juge.ca`** is where the Capacitor shell is implemented, against epic #471.
- The universal / App Link association files (#478) are a later shared dependency served by
  the web edition hosts; #471 does not touch them.

## 6. References

- Parent plan: `docs/plans/issue-481.md` (meta-epic) and children #471–#480.
- `juge.ca` `docs/BEYOND_MVP_ROADMAP.md` §3 (Mobile apps) and §4 (security findings #74, #469).
- `#74` (no privileged local data), `#472` (edition flavors), `#476` (offline exception),
  `#478` (deep / universal links).
- Operating Canon: human / legal review gate for auth / evidence / privacy / publication changes.
