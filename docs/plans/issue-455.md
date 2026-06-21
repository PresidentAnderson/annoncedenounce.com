# Plan — Issue #455: Legal review of jurisdiction content (pre-activation gate)

Status: PLAN (epic child / human-gated, counsel-required). This document is the deliverable.
Do NOT build or "complete" this issue from a PR — it is a ⛔ **pre-activation gate**: a signed
legal review must be on file before any jurisdiction's `enabled` flag is flipped live. An agent
can only prepare the package counsel reviews; it cannot perform or substitute the review, and it
must never flip the gate.

## Repo note (read first)

Issue #455 is a child of #417 ("Jurisdiction expansion — per-edition launch gate") and all the
jurisdiction content it concerns lives in the **`juge.ca`** repository, not in this
`annoncedenounce.com` static-site repo. This plan is authored from the `annoncedenounce.com`
worktree (the active autonomy worktree) so the implementation paths below are **`juge.ca`-relative**.
Any review-support tooling slice (the only [A] work) must be opened as a PR against `juge.ca`.
This PR carries only the plan so the issue has a tracked artifact (Refs #455).

CTO direction on #417 (2026-06-19): development and decomposition proceed **ahead of** counsel
review; the counsel-approved model and native-language review remain a **required gate before
COMMERCIAL ACTIVATION** (flipping the live flag), not a blocker to building. This issue #455 *is*
that gate.

Files inspected to ground this plan (all in `juge.ca`):
- `lib/editions.ts` — the edition registry. Each `Edition` carries `enabled: boolean` and
  `needsReview: boolean` (the two gate flags), plus the legal-facing content this review covers:
  `EditionAuthority` (regulator/professional/licence vocabulary), `EditionProfession[]`,
  `EditionLegalPolicy` (`privacyFramework`, `termsFramework`, `governingLaw`, `prevailingLanguage`,
  `retentionRule`, `legalHoldRule`, `counselGate`). Most editions are created `enabled:false` +
  `needsReview:true` by default (`makeEdition` defaults at lines ~780/786); only QC/launch
  countries are `enabled:true` + `needsReview:false`.
- `lib/legal/disclaimer.ts` — the brand-parameterized "information & AI, **not** legal advice"
  notice (FR reference adapted to Loi 96 / information-juridique vs avis-juridique). The
  information-not-advice posture this review must confirm per edition lives here.
- `lib/legal/authority-bank.ts`, `lib/citations` — citation verification (CourtListener / CanLII).
  The substrate for proving "no fabricated statutes" via real provenance.
- `lib/legal/*` — `authority-jurisdiction.ts`, `edition-templates.ts`, `us-pages.ts`,
  `attorney-marketplace-policy.ts`, `research-memo.ts`, `argument-map.ts` (per-edition legal text).
- `lib/ca-jurisdictions.ts`, `lib/us-jurisdictions.ts` — the per-jurisdiction data tables.
- `scripts/check-edition-purity.mjs`, `lib/editions-purity.ts` — the edition-purity guard (sibling
  pattern for the provenance/review-status CI invariant this gate needs; see #417's [A] items).

## Goal / scope

Establish and run the **legal-review gate** for a jurisdiction's legal content so that no edition
goes live without a signed counsel review on file. The review confirms, per edition:

In scope (what the gate verifies):
- The content is **information, not advice** — wording matches the `disclaimer.ts` posture in that
  jurisdiction's language and legal tradition (e.g. Loi 96 information-juridique distinction for QC;
  UPL-safe wording for US states).
- **No fabricated statutes, forms, fees, courts, or regulators** — every legal claim, citation,
  authority name, professional/licence label, and fee figure is real, sourced, and dated.
- The `EditionAuthority`, `EditionProfession[]`, and `EditionLegalPolicy` fields for the edition
  name the correct regulator, professions, governing law, and frameworks for that jurisdiction.
- Edition purity holds (no other jurisdiction's terms leak in — confirmed by the existing purity
  check before the review starts).

Explicitly out of scope (separate issues / not this gate):
- Authoring or editing the legal content itself — that is sibling-issue work; this gate only
  *reviews* a frozen candidate.
- Native-language review of the dictionary (the separate [H] item on #417 — pairs with this gate
  but is tracked apart).
- Building the launch allow-list / single audited flip path (separate [A] item on #417).
- The provenance-in-CI check (separate [A] item on #417; this gate consumes its output).

## What an agent can vs cannot do here

- **Cannot** (human/counsel only): perform the legal review; judge legal sufficiency; sign off;
  flip `enabled:true` / `needsReview:false`; alter any compliance attestation or gate flag.
- **Can** (the only safe [A] slice): assemble a **review package** that makes counsel's job
  mechanical and auditable, and add a CI guard that *records* whether a signed review exists for
  an edition without itself changing the flag.

## Sub-task checklist (A = automatable slice, H = human/counsel-gated)

- [ ] [A] Add a per-edition **review-package generator** (e.g. `scripts/build-jurisdiction-review.mjs`)
      that, given an `editionId`, emits a single reviewable bundle: every legal-facing string
      (`EditionAuthority`, `EditionProfession[]`, `EditionLegalPolicy`, edition templates, jurisdiction
      tables) with its current source citation + date, flagged where a citation is missing/unverified.
- [ ] [A] Run the existing `scripts/check-edition-purity.mjs` on the candidate edition and attach
      its clean result to the package (purity is a precondition of the review, not part of it).
- [ ] [A] Define a machine-checkable **review-record** artifact format (e.g.
      `docs/legal-reviews/<edition>.json|md`): `edition`, `reviewer`, `bar/role identifier`,
      `reviewedAt`, `scopeHash` (hash of the exact content reviewed), `findings`, `signOff: bool`.
      Storing the record does NOT change any flag.
- [ ] [A] Add a **read-only CI invariant** (mirror the purity-check wiring): if an edition is
      `enabled:true`, a matching signed review-record whose `scopeHash` equals the current content
      hash MUST exist; otherwise CI fails. This makes "live without a review on file" impossible
      while leaving the actual flip a separate, human action.
- [ ] [H/counsel] Counsel performs the review against the generated package: confirms
      information-not-advice, no fabricated statutes/forms/fees, correct authorities/professions.
- [ ] [H/counsel] Counsel signs the review-record (the `signOff`), establishing the on-file artifact
      the acceptance criterion requires.
- [ ] [H] Only after a signed record exists, a human performs the gate flip via the audited
      allow-list path (#417's flip-path item) — explicitly out of scope for any agent here.

## Human / architecture / counsel decisions required

1. **Reviewer identity & attestation model** (counsel + architecture): what the review-record
   captures (name? bar/jurisdiction id? attestation hash? signature method?) and where it is stored
   for audit. Must NOT reuse or mutate existing compliance attestations / gate flags.
2. **Scope-freeze mechanism** (architecture): how `scopeHash` is computed so a review unambiguously
   binds to the exact content reviewed, and re-review is forced when that content changes after sign-off.
3. **First candidate jurisdiction** (counsel + product, per #417): which edition is reviewed first
   (QC is already live; the gate's value is proving it on the *next* candidate before its flip).
4. **Source-of-truth per legal claim** (counsel): the authoritative source list (statute books,
   official fee schedules, regulator registries) each citation must trace to, so "no fabricated
   statutes/forms/fees" is verifiable, not asserted.
5. **Relationship to the native-language review** (#417 [H]): whether legal sign-off and native
   review are independent records or a combined gate, and their ordering.

## First safe slice (the only thing to build next, as a `juge.ca` PR)

Read-only, zero behavior change, flips nothing:

1. In `juge.ca`, add `scripts/build-jurisdiction-review.mjs <editionId>` that prints/writes the
   per-edition review package (all legal-facing strings + current citations/dates + missing-source
   flags) by reading `lib/editions.ts` and `lib/legal/*`. Pure read; no edition mutated.
2. Define the review-record format and add a single committed example record for the QC edition
   (already live, already reviewed) as the reference shape — `signOff` reflecting its real status.
3. Add the read-only CI invariant: for every `enabled:true` edition, assert a matching signed
   review-record exists with a `scopeHash` equal to the current content hash; fail CI otherwise.
   Wire it next to `scripts/check-edition-purity.mjs`. Run `npm run check:locales` in `juge.ca`.
4. Tests: the generator output for QC is stable; the invariant fails on a planted `enabled:true`
   edition lacking a signed record; the invariant fails when content changes but the record's
   `scopeHash` does not.

This slice is safe because it only *reads* content and *records/asserts* review status. It never
performs the legal review, never authors content, and never touches `enabled` / `needsReview` /
any attestation. The actual review (the [H/counsel] items) and the live flip remain gated on
counsel sign-off (#417) and a separate, human-performed flip.

Refs #455
