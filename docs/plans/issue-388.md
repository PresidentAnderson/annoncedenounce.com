# Plan — Issue #388: Support guide, Indigenous-language partnership translation track

Status: **PLAN** (no feature code shipped here — see "Blocking realities" below).
Tracking issue: PresidentAnderson/juge.ca#388 (Refs #388).

---

## 0. Important routing note (read first)

This worktree belongs to the **`annoncedenounce.com`** repository — a small static
launch site (`index.html`, `privacy.html`, a `scripts/` verifier). Issue #388,
however, is filed against and entirely describes the **`juge.ca`** application:

- The issue references `docs/support-guide/INDIGENOUS_PARTNERSHIP_TRACK.md`,
  `docs/support-guide/source-articles.md`, `docs/INDIGENOUS_LANGUAGE_PARTNERSHIPS.md`,
  `lib/content/platform-guide/<code>.ts`, the `PlatformArticle.reviewStatus` gate,
  and `getPlatformArticles()` — none of which exist in `annoncedenounce.com`.
- The task setup itself points `node_modules`, `tsc`, and `npm run check:locales`
  at the `juge.ca` checkout.

`annoncedenounce.com` has **no `lib/` tree, no locale dictionaries, no TypeScript
app, and no support-guide content**, so the feature cannot be implemented in this
repo/worktree. The autonomy rule ("stay in YOUR worktree; never touch the main
checkout") prevents editing the `juge.ca` working copy directly.

**Required human/orchestration decision:** re-route issue #388 to a `juge.ca`
worktree, or re-file it as a `juge.ca` issue. This plan documents the work so it is
ready to execute the moment it runs in the correct repo. It is carried as a PR here
only to satisfy the "every issue gets a PR" guarantee (Refs #388).

---

## 1. Scope

Track and, per language, ship **community-translated + reviewed** versions of the
"How Juge.ca works" support guide into eight Indigenous languages:

| Code | Language |
| --- | --- |
| `crk` | Plains Cree (nēhiyawēwin) |
| `iu`  | Inuktitut (syllabics) |
| `ikt` | Inuinnaqtun (Latin script) |
| `dgr` | Tłı̨chǫ (Dogrib) |
| `gwi` | Gwich'in |
| `chp` | Dene Sųłıné (Chipewyan) |
| `scs` | Sahtúotʼįné Yatı̨́ (North Slavey) |
| `xsl` | Dené Dháh (South Slavey) |

The supporting infrastructure already exists in `juge.ca` and is **not** part of
this work:
- Process/format doc: `docs/support-guide/INDIGENOUS_PARTNERSHIP_TRACK.md`
- Translator source kit (EN + FR): `docs/support-guide/source-articles.md`
- Governing policy: `docs/INDIGENOUS_LANGUAGE_PARTNERSHIPS.md`
- Publication gate (shipped in 7.23.7): `PlatformArticle.reviewStatus`
  (`draft` | `in-review` | `approved`), enforced by `isPublished()` inside
  `getPlatformArticles()`. Unapproved locales fall back to English. Verified live.

So this issue is a **long-running tracking + per-language content-onboarding**
issue, not a single code change.

---

## 2. Blocking realities (why no agent code change is correct)

1. **No machine translation — by policy.** Both the issue and the track doc state
   these languages run on a human, partnership-led track precisely because legal
   terminology often must be *coined with community authority*, not guessed by a
   model. An agent generating any `crk`/`iu`/… article text would directly violate
   the issue and `docs/INDIGENOUS_LANGUAGE_PARTNERSHIPS.md`.
2. **Publication is human-gated.** A language only goes live after a community
   translator, a linguistic + cultural reviewer, and a legal-boundary reviewer sign
   off and someone flips `reviewStatus` to `approved`. None of these are agent steps.
3. **Engagement is owner-led.** Translator engagement, scheduling, and community
   compensation are explicitly owner-led per the partnerships policy.

Net: there is no safe, in-scope code change an automated agent can make today. The
deliverable is this plan; execution per language is human-driven.

---

## 3. Per-language sub-task checklist (repeat for each of the 8 codes)

For `<code>` in `crk, iu, ikt, dgr, gwi, chp, scs, xsl`:

- [ ] **Engage** a community translator + a second community reviewer (owner-led).
- [ ] **Hand off source** `docs/support-guide/source-articles.md` (EN + FR), the
      do-not-translate list, and the legal-boundary requirement.
- [ ] **Community translation** of all 13 articles into a concise register; coin new
      legal terminology with community authority where none exists.
- [ ] **Linguistic + cultural review** by the second reviewer (accuracy, dialect,
      tone; correct script — syllabics for `iu`, Latin for `ikt`).
- [ ] **Legal-boundary check:** confirm every article still says the platform gives
      legal *information, not advice*, and that no disclaimer was lost or weakened.
- [ ] **Create** `lib/content/platform-guide/<code>.ts` from the source kit, keeping
      `id`, `slug`, `category`, `icon`, `readingMinutes` unchanged and preserving the
      do-not-translate terms (Juge.ca, Judge911.com, Stripe, Bates, OCR, PDF, ICS,
      CSV, GDPR, Law 25). Set `lang: "<code>"`, `updatedAt`, `reviewStatus: "in-review"`.
- [ ] **Import + spread** `<CODE>_ARTICLES` in `lib/content/platform-guide/index.ts`.
- [ ] **Stage as `in-review`** (sits in repo, does NOT serve; locale still falls back
      to English — verify the fallback).
- [ ] **Approve:** flip `reviewStatus` to `"approved"` (or remove the field) only
      after the legal-boundary check passes; the locale then goes live automatically.
- [ ] **Verify in app:** `getPlatformArticles()` now serves `<code>`; run `tsc`,
      `npm run check:locales`, and visually confirm the guide renders.
- [ ] **Tick the language box** in issue #388.

---

## 4. Human / architecture / counsel decisions required

- **Owner:** select and compensate community translators + reviewers per language;
  set the order of engagement.
- **Community authority:** approve coined legal terminology where no term exists.
- **Legal counsel / compliance:** sign off the legal-boundary check
  (information-not-advice preserved) before any `approved` flip.
- **Orchestration owner:** re-route this issue to a `juge.ca` worktree so the code
  steps in §3 can actually run (see §0).

## 5. First safe slice (when running in the correct repo)

Pick **one** language with a translator already engaged (per owner). Do the full §3
loop for it but **stop at `reviewStatus: "in-review"`** — i.e. land the
`lib/content/platform-guide/<code>.ts` file plus its `index.ts` import as a staged,
non-serving draft. This exercises the whole pipeline end to end (file format,
aggregator wiring, English fallback still active, `tsc` + `check:locales` green)
**without publishing anything**, because the publication gate keeps the draft out of
production until a human approves it. The `approved` flip is a separate, reviewer-led
change.

---

_No `lib/version.ts`, monetization/compliance gate, attestation, or migration is
touched by this plan. No machine-translated content is produced._
