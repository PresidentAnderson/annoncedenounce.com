# Plan — Issue #476 · [mobile] Secure offline access — encrypted local cache

> **Mode:** PLAN / epic / human-gated / **security + compliance**. This document is the
> deliverable. It does **not** build the feature. An encrypted offline cache is a *deliberate
> exception* to the #74 invariant ("no browser-stored litigation data for signed-in users"),
> so the exception must be **written and signed off before any caching code lands** — that is
> the first child of the epic, and it is a human gate, not an agent task.
>
> Companion governance doc: `issue-541.md` (the held-back mobile epic backlog). The Capacitor
> foundation (#471 / #473 / #476-shell, secure token storage) lives there under gate
> **[H-EXT] / [H-RLS]**. Every native item below is **blocked on it** — there is no native
> runtime in the repo yet. Where this plan and the epic backlog disagree, the epic is
> authoritative.

Refs #476. Resolves the deliberate-exception tension in **#74** (no browser-stored litigation
data). Cross-links #74 (the invariant) and the Capacitor shell tracked in `issue-541.md`.

> **Repository note.** The issue lives in the `juge.ca` litigation-OS repository; the file
> paths in this plan (`lib/store/*`, `lib/editions.ts`, `lib/mobile/*`,
> `supabase/migrations/*`) are that repo's. This doc is filed here as the PLAN deliverable for
> #476; the `[A]` code slices land in `juge.ca`.

---

## 1. Scope

**Goal (from the epic):** read-only offline *viewing* of a **user-selected** subset of
matters/documents on mobile, **without violating #74**, via an explicit security stance:
opt-in, biometric-gated, OS-keychain-encrypted, auto-expiring cache — **NOT** WebView
`localStorage`, **NOT** IndexedDB, **NOT** plaintext on disk.

**In scope of this plan:** decompose the epic's six children ([A]/[H]) into ordered,
gate-tagged sub-tasks; name the hard prerequisites (no native shell; the #74 exception is
unsigned); define the cache contract (encryption boundary, key custody, TTL + legal-hold
awareness, purge-on-signout); and identify the one slice that is safe to author today
(pure, web-testable cache-policy logic with no persistence side effects).

**Out of scope (any PR under this epic):**
- Building or merging the Capacitor shell itself (#471 / #473 / #476-shell — `issue-541.md`).
- Writing any plaintext or unencrypted cache, or any cache for signed-in data that lands in
  WebView `localStorage` / `IndexedDB` (that is the #74 violation this epic must avoid).
- Touching RLS, `lib/version.ts`, monetization/compliance gate flags, or attestations.
- Migrations beyond strictly additive ones (next free number is `0067`); no caching feature
  below requires a schema change in slice 0.
- Shipping **any** cache code before the **[H-LEGAL]** exception sign-off on #74/#476 is
  recorded — that gate blocks all `[A]` cache-write items.

**Why a plan and not a build:**
1. **No native target.** There is no `capacitor.config.ts`, no `ios/`, no `android/`. The
   whole premise — keys in the iOS Secure Enclave / Android Keystore, biometric prompt,
   OS-keychain-backed `secure-storage` plugin — needs a native runtime that does not exist
   yet. The shell is a strict prerequisite (#471/#473/#476, `issue-541.md`).
2. **Compliance exception gate `[H-LEGAL]`.** #74 is a founder-level invariant
   ("NO litigation data may live in the browser" for signed-in users, aligned with Loi 25 +
   solicitor-client privilege). An encrypted on-device cache is a *carve-out* from it. Per the
   epic's first child, the security stance must be written into the issue and **approved before
   any caching code lands**. An agent cannot grant itself that exception.
3. **Key-custody + crypto-boundary architecture `[H-SEC]`.** Where the data-encryption key
   lives (Secure Enclave / Keystore vs. derived from biometric unlock), what ciphertext
   format is used, and how the cache is provably wiped are security-design decisions that need
   review, not a default.

---

## 2. Gate classes (same taxonomy as `issue-541.md` / `issue-478.md`, plus the security gate)

| Gate | Trigger | Sign-off | Artifact required before code |
|---|---|---|---|
| **[A]** Agent-implementable | Pure logic, no persistence, no native, no new gate surface | Normal PR review | tests + `tsc --noEmit` clean |
| **[H-LEGAL]** Loi 25 / privilege / #74 exception | Any cache of signed-in litigation data on device | Founder + counsel, **recorded on #74** | written security stance approved on the issue |
| **[H-SEC]** Crypto boundary / key custody | Encryption algorithm, key storage (Enclave/Keystore), wipe proof | Security lead | threat model + key-lifecycle design reviewed |
| **[H-EXT]** External platform / secrets | Native shell, biometric entitlements, `secure-storage` plugin, store builds | Owner with dashboard access | provisioned capabilities; native shell merged (#471/#473/#476) |
| **[H-RLS]** Tenant isolation | Cache contents must stay scoped to the signed-in user | Eng lead + security | cache key namespaced to `auth.uid()`; cross-tenant leak test |

A sub-task with multiple badges needs **all** named gates.

---

## 3. Sub-task checklist (epic children → ordered work)

### Prerequisite 0 (blocks everything) — write the #74 exception FIRST
- [ ] **[H-LEGAL]** Author the security stance into #476/#74 **before any caching code**:
  exactly what may be cached (read-only view payloads only — never editable source of truth),
  for whom (opt-in, per-matter "make available offline"), under what protection
  (biometric-gated, OS-keychain-encrypted, auto-expiring), and the explicit statement that the
  WebView holds nothing privileged. **No `[A]` cache item below may merge until this is
  approved and recorded on #74.** (Epic child 1.)

### Prerequisite 1 (blocks every native item) — Capacitor shell + secure storage
- [ ] **#471 / #473 / #476-shell** Stand up the Capacitor shell with OS-keychain-backed
  secure token/secret storage. _[H-EXT][H-RLS]_ — owned by `issue-541.md`. This epic is
  **blocked on it** for the encryption key, the biometric prompt, and the secure-storage
  plugin. Do **not** duplicate it here.

### Child 2 — Encrypted, read-only cache for a user-selected subset
- [ ] **[A]** Define the **cache-policy core** (pure, framework-agnostic, web-testable): given
  a matter/document descriptor + the current edition + retention metadata, decide whether it is
  *cacheable*, build the *cache entry envelope* (id, edition, `ownerUid`, payload hash, created
  /expires timestamps, legal-hold flag), and decide *eviction*. Lives net-new in
  `lib/mobile/` (e.g. `lib/mobile/offline-cache-policy.ts`), edition-aware via
  `lib/editions.ts` (`currentEdition`). **No persistence, no crypto, no native** — just the
  rules. Unit-tested under `lib/mobile/__tests__/`. _[H-LEGAL: cacheability allow-list]_
- [ ] **[H-SEC][H-RLS]** Native cache writer: encrypt the envelope with a key held in the
  Secure Enclave / Keystore (via the shell's `secure-storage` plugin), keyed/namespaced to the
  signed-in `auth.uid()`. Always **user-initiated** ("make available offline"); never an
  implicit background cache. _[H-SEC][H-RLS]_
- [ ] **[H-EXT]** Wire the biometric gate (Face ID / fingerprint) in front of any cache read;
  failed/absent biometric → no plaintext is ever materialized. _[H-EXT]_

### Child 3 — Remote-wipe / sign-out purge clears the cache immediately
- [ ] **[A]** Define the **purge contract** in the cache-policy core: a single
  `purgeAllOfflineCache()` entry point and the invariant that sign-out, account switch, and a
  remote-wipe signal all call it. Pure description + the call-site list (tie into the existing
  sign-out path that already clears client state for #74). _[H-RLS]_
- [ ] **[H-SEC]** Native purge implementation: destroy the encrypted blobs **and** the
  data-encryption key material, verified by **storage inspection** (epic acceptance) — a
  post-purge read must find nothing decryptable. _[H-SEC]_

### Child 4 — Cache TTL + legal-hold awareness
- [ ] **[A]** Implement TTL + retention logic in the cache-policy core: every entry carries an
  `expiresAt`; expired entries are non-readable and trigger an **online re-fetch**, never a
  stale-serve. Respect **edition retention rules** and the **legal-hold** signal already
  modeled server-side (`supabase/migrations/0060_legal_hold_delete_guard.sql`) — a held matter
  must follow the edition's retention policy for its offline copy. Pure + unit-tested.
  _[H-LEGAL: retention semantics per edition]_
- [ ] **[H-SEC]** Ensure expiry deletes the ciphertext (not just hides it) on the device.

### Child 5 — Tests proving the #74 invariant on mobile
- [ ] **[A]** Author the **invariant tests** for the policy core: cacheable-set is read-only;
  envelopes never contain editable source-of-truth fields; purge empties everything; expired
  entries re-fetch. (Web-testable portion of epic child 5.) _[H-RLS]_
- [ ] **[H-RLS]** Native E2E proving the WebView holds **nothing privileged**: after "make
  available offline" + lock, inspect WebView `localStorage`/`IndexedDB` and confirm empty;
  confirm cached blobs are ciphertext; confirm purge + cross-user isolation. (This is the
  proof #74 demands on mobile.) _[H-RLS][H-SEC]_

### Child 6 — Founder/counsel sign-off (the human gate, recorded on #74)
- [ ] **[H-LEGAL]** Founder + counsel sign-off that the encrypted-offline **exception is
  acceptable under Loi 25 / solicitor-client privilege**, recorded on #74. This is epic child
  6 and is distinct from prerequisite 0 (which writes the *proposed* stance); this one
  *ratifies* it for production. _[H-LEGAL]_

---

## 4. Human / architecture / counsel decisions required before any `[A]` item past slice 0

1. **The #74 exception itself (counsel + founder).** Is an encrypted, biometric-gated,
   auto-expiring on-device cache an acceptable carve-out from "nothing privileged in the
   browser"? Recorded on #74. Until yes, no cache-write code ships. *(Blocks all of §3.)*
2. **Key custody (security).** Data-encryption key in Secure Enclave / Keystore vs. derived
   from the biometric unlock; rotation on sign-out; what exactly the purge destroys. Defines
   **[H-SEC]**.
3. **Crypto boundary (architecture).** Ciphertext format / AEAD choice, per-entry vs.
   per-vault encryption, and where decryption happens (native bridge — never inside the
   WebView, to keep the #74 "WebView holds nothing" invariant true).
4. **Cacheable surface (counsel + architecture).** Which read-only projections are eligible
   (e.g. matter summaries, rendered document views) and the explicit exclusion of any editable
   source-of-truth data. Edition-aware allow-list, like every other per-edition switch.
5. **TTL + legal-hold semantics (counsel).** Default TTL, per-edition retention overrides, and
   how a legal hold interacts with the offline copy (mirror `0060_legal_hold_delete_guard.sql`).
6. **Remote-wipe trigger (architecture).** What server signal initiates a remote wipe and how
   the device receives it (push channel #414? session revocation?), so purge is provable.

---

## 5. First safe slice (author now, no gate breached)

**Slice 0 — Pure cache-policy core + invariant tests (no persistence, no crypto, no native).**

What lands in the first `[A]` PR in `juge.ca`, none of it touching native, secrets, crypto,
RLS, the data model, migrations, `lib/version.ts`, or any gate flag:

1. `lib/mobile/offline-cache-policy.ts` (net-new): pure functions —
   - `isCacheable(descriptor, edition): boolean` (read-only projections only),
   - `buildCacheEntry(descriptor, now, edition): CacheEntry` (envelope with `ownerUid`,
     `editionId`, `payloadHash`, `createdAt`, `expiresAt`, `legalHold`),
   - `isExpired(entry, now): boolean` → expired ⇒ caller must re-fetch online,
   - `selectEvictable(entries, now): CacheEntry[]`,
   - `describePurge(): { entryPoint, callSites }` documenting the single
     `purgeAllOfflineCache()` contract.
   Edition-aware via `lib/editions.ts`. **No I/O, no `localStorage`, no IndexedDB, no
   `secure-storage`** — so it cannot violate #74 and needs no native runtime.
2. `lib/mobile/__tests__/offline-cache-policy.test.ts`: prove the invariants — cacheable set
   excludes editable fields; expired ⇒ re-fetch; purge empties; entries are owner-scoped;
   per-edition TTL/retention respected. Mirrors the existing edition-purity test style.
3. A short `// SECURITY: see docs/plans/issue-476.md` note at the top of the new file pointing
   the eventual native writer at the #74 exception gate, so no one wires persistence before the
   `[H-LEGAL]` sign-off.

This slice is **defensive by construction**: it defines the rules that the gated native layer
must obey, makes the #74 invariant executable as tests, and writes **zero** bytes of cache —
so it advances the epic without spending any of its human gates.

---

## 6. Guardrails honored by this plan

- **#74 invariant preserved:** nothing in slice 0 writes signed-in data to any browser store;
  the encrypted cache itself is gated behind founder/counsel sign-off recorded on #74.
- **No gate flags / attestations / `lib/version.ts` touched.**
- **Migrations additive-only;** next free number documented as `0067` (none needed for slice 0).
- **Markdown-only deliverable here** — no `.ts` changed in this PR, so no new type errors.
