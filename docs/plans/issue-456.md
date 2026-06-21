# Plan — Issue #456: Native-language review (pre-activation gate)

> **Mode:** PLAN (epic / human-gated). This document is the deliverable. No
> feature is built here. It defines scope, a concrete sub-task checklist, the
> human/architecture/counsel decisions required, and the first safe slice.

Parent epic: **#417** — *Jurisdiction expansion — per-edition launch gate &
review process*. Sibling gates: #450–#455.

---

## ⚠️ Routing note (first decision a human must make)

Issue #456 lives in the **`juge.ca`** repository and targets that codebase's
`lib/editions.ts` edition registry, its locale dictionaries, and its
`npm run check:locales` coverage script. The autonomy worktree that produced
this plan is checked out against **`annoncedenounce.com`** — a static launch
site with no `lib/`, no edition registry, no TypeScript build, and no locale
tooling.

Per `docs/OPERATING_CANON.md`, this repo intentionally mirrors the juge.ca
operating shape ("Reference implementation patterns: `juge.ca`") and requires
human/legal review for any change touching legal pages, publication rules, or
jurisdiction posture. The native-language pre-activation gate is therefore a
governance concern shared by both repos, but the **implementation belongs in
`juge.ca`**, where the editions and dictionaries actually exist.

**Decision required (human):** confirm where the executable gate lands.
- **Option A (recommended):** port/track this plan into `juge.ca` and implement
  the gate there against `lib/editions.ts` + `scripts/check-locale-coverage.ts`.
- **Option B:** if `annoncedenounce.com` will host its own French/EN dictionary
  before live, mirror a slimmed gate here for this site's legal/static content.

This plan is written to be valid for Option A (the canonical case) and notes
where Option B would differ.

---

## Scope

A jurisdiction edition is born `enabled:false` + `needsReview:true`. Before the
live flip, a qualified **native speaker** of the edition's target language must
review the edition's user-facing dictionary and legal vocabulary and record a
**sign-off on the exact file/version** that goes live. This issue delivers the
*review gate* — the repeatable process, the artefact that captures sign-off, and
the CI check that refuses a live flip without it.

**In scope**
- A native-language review checklist tied to a specific edition + content
  revision.
- A machine-readable sign-off artefact (who, what file, what content hash,
  when) that the activation path can verify.
- A CI guard that blocks flipping `needsReview:false` / `enabled:true` for an
  edition lacking a valid, current sign-off.

**Out of scope (covered by sibling gates under #417)**
- Counsel/legal content review — #417 `[H/counsel]` item (information-not-advice,
  no fabricated statutes/fees).
- Content provenance / sourcing CI — separate #417 `[A]` item.
- Edition-purity verification — separate #417 `[A]` item.
- The single audited activation flip mechanism — separate #417 `[A]` item; this
  gate *feeds* it but does not own it.

---

## Sub-task checklist

- [ ] **[H]** Decide the routing question above (Option A vs B); record the
      decision in the issue.
- [ ] **[A]** Inventory the per-edition native-language surface in
      `lib/editions.ts` (the `L = Record<string,string>` maps: `authority`,
      `profession`, currency/labels) plus any locale dictionary the edition
      ships, so reviewers see the complete set of strings.
- [ ] **[H]** Define reviewer qualification: who counts as a "native reviewer"
      for an edition (language + jurisdiction familiarity), and how their
      identity/qualification is recorded for audit.
- [ ] **[A]** Design the sign-off artefact format — proposal: a per-edition
      file under `docs/launch/<editionId>/native-language-signoff.md` (human
      narrative) plus a checked-in machine record (reviewer, ISO date, edition
      id, reviewed content revision, and a content hash of the reviewed
      strings) so CI can detect drift after sign-off.
- [ ] **[A]** Implement the content-hash helper that snapshots an edition's
      reviewed string surface, reusing the same extraction the
      locale-coverage check already walks.
- [ ] **[A]** Add a CI guard (extend or sit beside `check:locales`) that, for
      any edition transitioning to live, fails if: no sign-off artefact exists,
      the reviewed hash != current hash (content changed since sign-off), or
      the artefact is malformed.
- [ ] **[A]** Document the gate as a reusable template under `docs/` (the #417
      `[A]` Definition-of-Done item references this).
- [ ] **[H]** Dry-run the gate on the first candidate edition (sequenced by the
      #417 `[H]` "pick next jurisdiction" item) and capture a real sign-off.
- [ ] **[A]** Wire the activation path to *read* this gate (coordinate with the
      audited-flip sibling task; do not duplicate the flip logic here).

## Human / architecture / counsel decisions required

1. **[H] Routing** — Option A (juge.ca) vs Option B (this repo). Blocks all
   implementation.
2. **[H] Reviewer standard** — qualification bar, conflict-of-interest rules,
   and how a reviewer attests (signed commit? PR approval by a named reviewer?
   external attestation file?). Drives the artefact's trust model.
3. **[Architecture] Drift policy** — does *any* post-sign-off change to a
   reviewed string re-open the gate, or only changes to a defined "legally
   material" subset? Content-hash scope depends on this answer.
4. **[Architecture] Artefact location & schema** — agree the canonical path and
   fields before code, so the activation path and CI read one format.
5. **[H/counsel] Interaction with legal review** — confirm native-language
   sign-off and counsel sign-off are independent gates that must *both* pass,
   and the order, per the #417 CTO note (review is required before COMMERCIAL
   ACTIVATION, not before building).

> **Hard-rule guardrails for whoever implements:** do not flip any
> monetization/compliance gate flag or edition `enabled`/`needsReview`
> attestation as part of this work; the gate only *blocks* the flip, it never
> performs it. Any migration must be additive with the next free number.
> Never edit `lib/version.ts`.

## First safe slice

Smallest reviewable, non-activating step (safe even before decisions 2–5 are
final, once routing decision 1 picks juge.ca):

1. Land **this plan** so the issue carries a PR and the routing decision is
   visible (this PR).
2. Add a **documentation-only** reusable template at
   `docs/launch/native-language-review.template.md` describing the checklist
   and the proposed sign-off artefact fields — no code, no flag changes, no CI
   wiring. This is pure docs, cannot affect any live edition, and gives the
   human reviewers a concrete artefact to react to in decisions 2–4.

Everything beyond step 2 (hash helper, CI guard, activation wiring) waits on the
human/architecture decisions above and ships in follow-up PRs.

## Verification

- PLAN mode: this doc is the deliverable; no build is performed.
- This worktree (`annoncedenounce.com`) has no `tsc` or `check:locales`; those
  gates apply when the work is implemented in `juge.ca` and MUST be run there
  (`node_modules/.bin/tsc --noEmit`, `npm run check:locales`) once code lands.

## References

- Parent epic: #417
- `lib/editions.ts` (juge.ca) — edition registry, `enabled` / `needsReview`
  flags, native-language `L` string maps.
- `scripts/check-locale-coverage.ts` (juge.ca) — existing locale walker to reuse.
- `docs/OPERATING_CANON.md` — human/legal review requirement for legal-content
  and publication-posture changes.
