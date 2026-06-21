# Plan — Issue #467: [epic] Rich: Community & Academy with a UPL guard

> Status: PLAN (epic / human-gated). This document is the deliverable. Do **not**
> build the feature from this PR. It scopes the work, breaks it into safe slices,
> enumerates the human / architecture / counsel decisions that must precede any
> build, and names the first safe slice.
>
> The feature epic targets the **`juge.ca`** product codebase (Next.js + Supabase
> migrations under `supabase/migrations/`). This plan is checked into the
> `annoncedenounce.com` repo's `docs/plans/` because that is where this worktree
> lives; the implementing PRs will land in `juge.ca`. Code-path references below
> point at the `juge.ca` tree.

## 1. Scope

Turn the tool into a justice ecosystem with three pillars, all behind an
**active Unauthorized-Practice-of-Law (UPL) guard**:

1. **Moderated multilingual Q&A** — peer threads where people share *experience*,
   with translation metadata and verified-professional badges.
2. **Guided self-help flows** — jurisdiction decision-trees that give
   *information + options*, never *advice*, and only for `live` jurisdictions.
3. **Academy** — courses / lessons / quizzes with completion tracking; all legal
   content review-gated before publish.

The differentiator and the hard constraint is the **UPL guard**: a non-professional
who posts *directive* advice is flagged and the asker is routed to a verified
professional. The guard is **suggest-only**; the Community Agent **never bans or
takes down content alone** — every enforcement action is human-confirmed.

Cross-links: #377 (Community / Academy agents — agent constitution), #388
(Indigenous-language partnership translation track), #156 (criminal-justice flows).

### In scope (the seven epic children)
- **[A]** Moderated Q&A model + surface (threads, translation metadata,
  verified-pro badges); non-pro directive answer → UPL flag + route.
- **[A]** UPL-guard classifier (suggest-only) → human moderation queue
  (Community Agent cannot auto-takedown).
- **[A]** Guided self-help decision-tree flows per `live` jurisdiction
  (information + options, not advice); **no local law for non-`live`**.
- **[A]** Academy course / lesson / quiz model + completion; legal content gated
  `needs_review → approved → published`.
- **[A]** Knowledge-capture loop: clustered community questions →
  Help-Center / Academy draft tasks.
- **[H]** Indigenous-language partnership track (#388): partnership-governed
  translation, **not raw MT**.
- **[H]** Counsel + native review of all jurisdiction explainers + Academy legal
  content before publish.

### Explicitly out of scope (this epic)
- Auto-moderation / auto-takedown / auto-ban of any kind.
- Surfacing local-law self-help for any non-`live` jurisdiction
  (today only QC = rollout phase 1; see `lib/ca-jurisdictions.ts`).
- Raw machine translation of Indigenous-language content.
- Any change to monetization / compliance gate flags, attestations, or
  `lib/version.ts`.

## 2. Existing substrate (what to build on, not re-invent)

- **Jurisdiction model & `live` definition:** `lib/ca-jurisdictions.ts`.
  "Live" = rollout phase 1 (QC today). Each jurisdiction already carries an
  explicit per-feature support map with EXPLICIT unsupported states and **no
  Québec fallback outside QC** — self-help flows must reuse this, not add a
  parallel notion of "supported".
- **Editions / routing:** `lib/editions.ts`, `lib/editions-purity.ts`,
  `lib/editions-routing.ts`.
- **Community availability primitives:** `lib/community-availability.ts`.
- **Criminal-justice flows (#156):** `lib/criminal-justice/` — self-help
  decision-trees should follow the same information-not-advice pattern.
- **Migrations:** `supabase/migrations/`. Latest is `0066_site_presence.sql`,
  so the **next free number is `0067`**. Migrations must be **additive-only**.
- **Verification of professional standing:** `lib/bar-authorities.ts`,
  `CaLawSociety` in `lib/ca-jurisdictions.ts` — the verified-pro badge MUST
  derive from these, never a self-asserted flag.
- **Counsel sign-off gate (O7):** structural legal facts (e.g. small-claims
  limits) are already counsel-gated and agents never self-approve. The Academy
  `needs_review → approved → published` workflow must hang off this same gate.

## 3. Sub-task checklist (sequenced, each its own PR)

Slices are ordered so the **UPL guard and the review gate exist before any
user-visible legal content does.** Never ship a content surface ahead of its guard.

- [ ] **S0 — Data model (migration `0067`+, additive-only).**
  Tables: `community_threads`, `community_posts`, `post_translations`
  (with `source` = `human` | `machine` | `partnership` + disclosure flag),
  `upl_flags` (status `open` | `confirmed` | `dismissed`, never auto-resolving),
  `moderation_queue`, `academy_courses` / `lessons` / `quizzes` /
  `enrollments` / `completions`, `content_review_state`
  (`needs_review` | `approved` | `published`). RLS on every table.
  No enum or column repurposing; new tables / columns only.
- [ ] **S1 — UPL-guard classifier (suggest-only).** Server-side classifier that
  scores a post as experience-sharing vs. directive advice from a non-pro.
  Output is a *suggestion row* into `moderation_queue`; it never mutates or
  hides the post. Includes the "route asker to a verified professional" action
  surface for human moderators.
- [ ] **S2 — Human moderation queue UI + actions.** Confirm / dismiss UPL flags;
  every takedown / route action writes an audit row and requires a human actor.
  Community Agent has **no** auto-action capability here.
- [ ] **S3 — Q&A surface.** Threads, posts, verified-pro badge (sourced from
  `lib/bar-authorities.ts`), translation metadata + machine-translation
  **disclosure** banner. FR is authority on QC content (Loi 96): QC threads
  render FR as canonical, MT clearly labelled.
- [ ] **S4 — Guided self-help decision-trees** keyed off `lib/ca-jurisdictions.ts`
  `live` jurisdictions only. Non-`live` → explicit unsupported state, never a
  QC fallback. Copy is "information + options", reviewed by counsel (S6 gate).
- [ ] **S5 — Academy model + surface** (courses / lessons / quizzes / completion).
  Legal lessons cannot reach `published` without an `approved` review row.
- [ ] **S6 — Review-gate workflow** wiring all legal content (explainers, Academy
  legal lessons) through `needs_review → approved → published` on the O7 counsel
  gate. **[H]**
- [ ] **S7 — Knowledge-capture loop.** Cluster community questions →
  create *draft* Help-Center / Academy tasks (never auto-publish).
- [ ] **S8 — Indigenous-language partnership track (#388).** Wire
  `post_translations.source = partnership`; block raw MT for these languages;
  governance per #388. **[H]**

## 4. Human / architecture / counsel decisions required (gates)

These must be answered by a human before the corresponding slice is built.

1. **UPL classifier policy (counsel + product).** What linguistic signals count as
   "directive advice" vs. "shared experience"? Acceptable false-positive rate?
   Per-jurisdiction definition of UPL (QC notaries vs. lawyers differ)?
2. **Community Agent constitution (#377).** Confirm the agent's allowed actions are
   strictly suggest-only; document the human-confirm step for every enforcement.
3. **Verified-pro badge source of truth.** Confirm the badge derives only from
   `lib/bar-authorities.ts` / law-society verification — no self-asserted status.
4. **Self-help "information vs. advice" line (counsel).** Sign-off on decision-tree
   copy templates per `live` jurisdiction; QC FR canonical (Loi 96).
5. **Academy review gate ownership (counsel, O7).** Who can move content from
   `approved → published`? Reuse existing O7 sign-off; agents never self-approve.
6. **Machine-translation disclosure UX (legal + design).** Exact disclosure wording
   per locale and where it renders.
7. **Indigenous-language partnership governance (#388, partners).** Which languages,
   which community partners, and the rule that blocks raw MT for them.
8. **Data-retention / privacy for community PII** (privacy counsel) — retention,
   deletion, and RLS scope for user-generated content.
9. **Architecture: classifier hosting** — in-repo model vs. existing `lib/ai/`
   pipeline; latency and audit-logging requirements.

## 5. First safe slice (recommended starting PR)

**Slice S0 — additive data model migration + types, no surface.**

- Add `supabase/migrations/0067_community_academy_substrate.sql` (additive-only,
  RLS-on, new tables only; next free number after `0066`).
- Add TypeScript types mirroring the schema and the
  `needs_review | approved | published` and UPL-flag enums.
- **No UI, no agent, no public route, no published legal content** — so nothing
  user-visible ships ahead of its guard or its counsel review.

Why this is safe: it is purely additive, ships behind no flag, exposes no legal
content, and unblocks S1 (the UPL guard) and S6 (the review gate), which are the
prerequisites every content-bearing slice depends on.

### Guardrails carried into every slice
- UPL guard is **suggest-only**; Community Agent **never** auto-takes-down / bans.
- Academy + jurisdiction legal content is **review-gated** before publish.
- Machine translation is **always disclosed**.
- **FR is authority on QC** content (Loi 96).
- Self-help local law for **`live` jurisdictions only**; explicit unsupported
  state otherwise — no QC fallback.
- Migrations **additive-only**, next free number.
- Do **not** edit `lib/version.ts`; do **not** flip monetization / compliance
  gate flags or attestations.
