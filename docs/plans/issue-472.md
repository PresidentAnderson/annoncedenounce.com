# Plan — Issue #472 · [mobile] Edition-aware app identity (Juge.ca vs Judge911, one codebase)

> **Mode:** PLAN / epic / human-gated. This document is the deliverable. It does **not** build
> the feature. Two signed store artifacts, store-console listings, and per-edition signing
> certificates cannot be produced by an agent edit — they need Apple/Google dashboard access,
> reserved bundle IDs, and a per-jurisdiction UPL review of what each app is allowed to surface.
> This doc makes the work legible, sequences it behind its real prerequisites, and names the one
> slice that is safe to ship inside the existing Next.js web app today.

Refs #472.

---

## 0. Provenance / repo boundary (read first)

Issue **#472 lives in the `juge.ca` repo** (`PresidentAnderson/juge.ca`), whose codebase the
issue describes (`lib/editions.ts`, `app/[lang]/layout.tsx`, `lib/mobile/app-config.ts`, the
`.well-known` AASA / assetlinks routes, `npm run check:locales`). This plan was authored from an
**isolated worktree of the `annoncedenounce.com` repo**, which is where the autonomy run was
allowed to write and open its PR. The plan therefore carries `Refs #472` so the issue gets a
PR, but **the code slices below must be implemented in the `juge.ca` repo**, not here. A
maintainer should copy this doc (or its first-slice tasks) into `juge.ca/docs/plans/issue-472.md`
when scheduling the work. Nothing in `annoncedenounce.com` is changed by this epic.

All file paths in §3–§5 are **`juge.ca`-relative**.

---

## 1. Scope

**Goal (from the epic):** ship **two store apps — Juge.ca (QC) and Judge911 (US) — from one
codebase**, each pinned to its edition at build time via `NEXT_PUBLIC_EDITION`, with **no
cross-jurisdiction leak**. A single installed app can never be both editions: that is both a UPL
problem (wrong-jurisdiction legal surface) and a store-policy problem (one listing, one identity).

**In scope of this plan:** decompose the epic's six children into ordered, gate-tagged sub-tasks;
identify the hard prerequisites; confirm what the codebase already provides; and ship the one
web/data-only, no-gate first slice (the build-edition assertion + the edition-purity test
extension) that needs no native runtime and no external credentials.

**Out of scope (any PR under this epic):**
- Building or merging the Capacitor/native shell itself (tracked separately — see §3 Prereq).
- Writing migrations; touching RLS; editing `lib/version.ts`; flipping any monetization /
  compliance gate flag or attestation; changing the persisted matter data model.
- Reserving bundle IDs or creating store listings (`[H-EXT]`, dashboard-only).
- Producing or committing signing certificates / SHA-256 fingerprints.

**Why a plan and not a build:**
1. **No native target in the repo.** There is no `capacitor.config.ts`, no `ios/`, no
   `android/`. iOS schemes / Android flavors, per-edition icons, and a deep-link claim all need
   a native project to attach to. The shell is a strict prerequisite.
2. **External-platform gate `[H-EXT]`.** Two bundle IDs + two App Store Connect / Play Console
   listings, and the per-edition signing certs whose SHA-256 fingerprints feed
   `app/.well-known/assetlinks.json/route.ts`, require credentialed dashboard access — an agent
   cannot create them.
3. **UPL / jurisdiction gate `[H-LEGAL]`.** "A US build can't surface QC professions or vice
   versa" is the core edition-purity invariant (`lib/editions-purity.ts`). Hardening it for the
   native surface is counsel-relevant: misrouting an edition is the wrong-jurisdiction risk the
   whole edition system exists to prevent.

---

## 2. Gate classes (same taxonomy as `issue-478.md` / `issue-541.md`)

| Gate | Trigger | Sign-off | Artifact required before code |
|---|---|---|---|
| **[A]** Agent-implementable | Web/data-only, additive, no new gate surface | Normal PR review | tests + `tsc --noEmit` clean; `npm run check:locales` for any i18n |
| **[H-EXT]** External platform / secrets | Bundle-ID reservation, App Store Connect / Play Console listings, signing certs, SHA-256 fingerprints | Owner with dashboard access | reserved IDs + provisioned fingerprints in the secret store; access confirmed |
| **[H-LEGAL]** UPL / jurisdiction | A build could surface another jurisdiction's professions, authority, or legal copy | Counsel (per edition) | UPL red-team of the per-edition surface; confirm edition purity preserved |
| **[H-ARCH]** Architecture decision | Choice of native wrapper, build matrix, one-source→two-artifacts proof | Eng lead | written decision doc; reproducible build script |

A sub-task with two badges needs **both** gates.

---

## 3. Sub-task checklist (epic children → ordered work)

### Prerequisite (blocks every native item below) — track separately, do **not** duplicate here
- [ ] **Native shell** Stand up the Capacitor (or chosen wrapper) project: `capacitor.config.ts`,
  `ios/`, `android/`, web-asset sync. _[H-ARCH][H-EXT]_ — every native item (icons, schemes,
  flavors, deep-link claim) is **blocked on it**. The data layer it will read already exists
  (`lib/mobile/app-config.ts`), so that wiring is mechanical once the shell lands.

### Child 1 — Decision doc: TWO listings, ONE codebase, build-time edition  _[H-ARCH]_
- [ ] **[A]** Draft `docs/decisions/two-listings-one-codebase.md`: why one source tree → two
  signed artifacts (not a runtime toggle), keyed on `NEXT_PUBLIC_EDITION` at build time. Cite the
  legal reason (a single app can't be both jurisdictions) and the store-policy reason (distinct
  identities). Already half-proven by `lib/mobile/app-config.ts` deriving identity per edition.
- [ ] **[A]** Add a **build script that proves one source → two artifacts**: a CI matrix over
  `NEXT_PUBLIC_EDITION=qc` and `=us` that builds web assets + emits each `MobileAppConfig`, and
  asserts the two configs differ in `bundleId` / `scheme` / `serverUrl` / `appName`. Web-testable
  before the shell exists.

### Child 2 — iOS schemes + Android flavors (bundle ID, name, icon, server.url, edition)  _[H-EXT]_
- [ ] **[A]** Generator/wiring that reads `mobileAppConfig(edition)` from `lib/mobile/app-config.ts`
  and emits the per-edition native config values (`appName`, `bundleId`, `scheme`, `serverUrl`).
  The pure matrix already exists; this binds it to one iOS scheme + one Android product flavor per
  edition. _Blocked on the shell._
- [ ] **[H-EXT]** Set the real bundle IDs (`ca.juge.app`, `com.judge911.app`) and `server.url`
  in the native projects; confirm against the reserved IDs (Child 6).

### Child 3 — Per-edition icons / splash / store assets  _[H-EXT]_
- [ ] **[A]** Asset-generation step that picks `/juge-logo.png` vs `/judge911-logo.png` /
  `/judge911-icon.png` by edition — **mirror the existing `isUs` branch** in
  `app/[lang]/layout.tsx` (lines ~64–68) and `app/[lang]/manifest.ts` (lines ~22–23). Centralize
  the brand-asset choice into one helper (e.g. `lib/edition-assets.ts`) so web + native + store
  read the same map (DRY; removes the duplicated `isUs` ternary).
- [ ] **[H-EXT]** Upload generated store screenshots / feature graphics to each listing.

### Child 4 — Edition-purity guard: US build can't surface QC professions (or vice versa)  _[A][H-LEGAL]_
- [ ] **[A]** Extend the editions-integrity / purity tests (`lib/__tests__/editions-purity.test.ts`,
  `lib/editions-purity.ts`) with an **explicit cross-edition profession-leak assertion**: for each
  enabled edition, no other edition's `EditionProfession` vocabulary appears in its resolved
  surface (e.g. US never lists `huissier`; QC never lists `process server`). Reads
  `editionProfessions` / `editionProfessionIds` from `lib/editions.ts`. No native dependency.
- [ ] **[A]** Add a **build-edition assertion** so a build pinned to `NEXT_PUBLIC_EDITION=us`
  fails fast if `CURRENT_EDITION_ID !== "us"` (and likewise for `qc`) — closes the
  "accidentally shipped the wrong edition" hole at build time. (First slice — see §5.)
- [ ] **[H-LEGAL]** Counsel review of the full per-edition surface (professions + authority +
  legal copy) before either app is submitted.

### Child 5 — Deep-link domain isolation (QC app claims juge.ca only; US app judge911.com only)  _[H-EXT]_
- [ ] **[A]** Already grounded: `lib/__tests__/editions-domains.test.ts` pins `qc → juge.ca`,
  `us → judge911.com`, distinct hosts, no cross-leak. AASA (`app/.well-known/apple-app-site-
  association/route.ts`) and assetlinks (`app/.well-known/assetlinks.json/route.ts`) are already
  per-edition and env-keyed. Extend the domains test to also assert each edition's
  `mobileAppConfig().serverUrl` host matches its registry host (binds native config to the
  isolation invariant).
- [ ] **[H-EXT]** Populate `NEXT_PUBLIC_IOS_APP_ID_<ED>`, `NEXT_PUBLIC_ANDROID_PACKAGE_<ED>`,
  `NEXT_PUBLIC_ANDROID_SHA256_<ED>` per deployment so each app claims only its own domain;
  configure Associated Domains (Apple) / App Links verification (Google) on the right account.

### Child 6 — Reserve two bundle IDs + two listings (App Store Connect + Play Console)  _[H-EXT]_
- [ ] **[H-EXT]** Reserve `ca.juge.app` (QC) and `com.judge911.app` (US); create one listing per
  app on each store. Feed the resulting IDs/fingerprints back into Child 2 / Child 5 env vars.
  Pure dashboard work; no code.

---

## 4. Human / architecture / counsel decisions required

1. **[H-ARCH]** Native wrapper choice (Capacitor assumed by `lib/mobile/app-config.ts`'s doc
   comment and `issue-541.md`) and the one-source→two-artifacts build matrix shape. Blocks all
   native children.
2. **[H-ARCH]** Canonical bundle-ID scheme. `lib/mobile/app-config.ts` derives `<tld>.<appid>.app`
   → `ca.juge.app` (QC) and `com.judge911.app` (US). Confirm these are the IDs to reserve, or
   override; once reserved they are effectively permanent.
3. **[H-EXT]** Store accounts + who holds Apple/Google dashboard access and the signing certs.
   Needed for bundle reservation, listings, Associated Domains, App Links verification.
4. **[H-LEGAL]** Per-edition UPL sign-off that each app surfaces only its own jurisdiction's
   professions, authority, and legal copy — the purity invariant must be counsel-confirmed before
   either app is submitted, not just test-green.
5. **[H-LEGAL/ARCH]** What deep-link paths each edition may claim (the AASA `paths` list and
   App Links intent filters) — coordinate with the deep-linking epic (#478) so the route
   allow-list stays edition-pure.

---

## 5. First safe slice (no gate — `[A]`, ship now in `juge.ca`)

The one change that is web/data-only, additive, needs no native runtime and no external
credentials, and directly advances Child 4:

**Build-edition purity assertion + cross-edition profession-leak test.**

1. **Build-edition assertion** (`lib/mobile/build-edition.ts`, net-new): a pure helper
   `assertBuildEdition(expected: EditionId, actual = CURRENT_EDITION_ID)` that throws when a
   build is pinned to one edition but the resolver disagrees. Wire it into the CI build matrix
   (Child 1) so a `NEXT_PUBLIC_EDITION=us` build can never silently emit the QC edition.
2. **Cross-edition profession-leak test** (extend `lib/__tests__/editions-purity.test.ts`): for
   every enabled edition, assert none of *another* enabled edition's `editionProfessionIds`
   appears in its surface — codifying "US can't surface QC professions, or vice versa" as a
   regression guard that runs on every PR, long before any native build exists.
3. **(Optional, same slice) DRY the brand-asset choice** into `lib/edition-assets.ts` so the
   duplicated `isUs ? "/judge911-logo.png" : "/juge-logo.png"` ternary in
   `app/[lang]/layout.tsx` and `app/[lang]/manifest.ts` resolves through one map — the seam
   Child 3 will reuse for icons/splash/store assets.

**Acceptance for the first slice:**
- `node_modules/.bin/tsc --noEmit` adds no new errors in touched files.
- `npm test` green, including the new leak assertion.
- `npm run check:locales` clean (only if any user-facing string is touched; the slice above
  adds none).
- No change to `lib/version.ts`, no migration, no gate-flag/attestation edits, no native files.

Everything else in §3 is blocked on the native shell (`[H-ARCH]`/`[H-EXT]`) or counsel
(`[H-LEGAL]`) and must wait for the matching sign-off.
