# Plan — Issue #479: [mobile] App store presence (listings, privacy, ratings, legal-app review)

Status: PLAN (epic / human-gated). Do not build from this doc. It scopes the work,
lists the human/architecture/counsel decisions, and names the first safe slice.

Mode note: #479 is filed against the `juge.ca` mobile apps (Juge.ca FR-first, Judge911 EN).
This repository (`annoncedenounce.com`) is the static launch site of the same product family
and shares its legal posture and disambiguation copy. This plan therefore covers (a) the
canonical, cross-app store-readiness work and (b) the slice this repo can safely own without
human/counsel sign-off: a reusable store-copy + disclaimer source of truth that mirrors the
existing site disambiguation, so both apps draw identical "not a court/judge/government" wording.

Cross-links: #74 (privacy / data inventory). Mirror source: `index.html` JSON-LD (`@graph`),
`privacy.html`, `site.webmanifest`, `docs/OPERATING_CANON.md`.

## Goal

Ship both apps through Apple App Store + Google Play review with correct privacy / data-safety
declarations, age ratings, and legal-app (UPL / impersonation) risk handled — with no
"legal advice", "court", "judge", or "government" implication in any store-facing surface.

## Scope

In scope:
- Store metadata (titles, subtitles, descriptions, keywords) per app and per language.
- Real-workspace screenshots with a clear "not a court / judge / government" disambiguation.
- Apple Privacy Nutrition labels + Play Data Safety, consistent with the #74 data inventory.
- In-app account deletion path (App Store requirement) wired to recover/retention flows.
- App Review notes justifying native function to clear Guideline 4.2 ("just a website").
- Age rating + export-compliance (encryption) declarations for the offline cache.
- Counsel review of all store copy for UPL / impersonation risk.
- Submission and review back-and-forth for both apps.

Out of scope:
- App feature work, native modules, the deletion backend itself (tracked elsewhere; this epic
  consumes those flows, it does not build them).
- Any change to `lib/version.ts`, monetization / compliance gate flags, or attestations.
- Changes to legal posture — agents prepare; humans/counsel decide (`OPERATING_CANON.md`).

## Sub-task checklist

Automatable preparation `[A]` (agents may draft; nothing ships to a store without `[H]` sign-off):
- [ ] [A] Draft store metadata — FR-first for Juge.ca, EN for Judge911 — titles/subtitles/
      descriptions/keywords/promotional text, per store character limits.
- [ ] [A] Add explicit "not a court, not a judge, not a government service, not legal advice"
      disambiguation to each description and at least one screenshot caption, mirroring the
      JSON-LD `Organization`/`description` in `index.html` and the privacy framing in `privacy.html`.
- [ ] [A] Assemble real-workspace screenshot shot list + caption copy (per device class / locale).
- [ ] [A] Build the Apple Privacy Nutrition + Play Data Safety declaration tables from the #74
      data inventory: auth, document/photo capture, push tokens, Canadian storage, no data sale.
- [ ] [A] Draft App Review notes describing native-only function (camera/scanner, push,
      biometric, offline cache) to pre-empt Guideline 4.2.
- [ ] [A] Draft age-rating questionnaire answers and the export-compliance (encryption) stance
      for the offline cache (likely "uses standard/exempt encryption" — confirm with `[H]`).
- [ ] [A] Produce a single shared store-copy + disclaimer source of truth (this repo's slice;
      see "First safe slice") that both app submissions import, preventing drift.

Human / architecture / counsel decisions `[H]` (gates — must be resolved before submission):
- [ ] [H] Confirm the legal entity + Privacy Officer contact for store agreements
      (currently bracketed `[à confirmer]` in `privacy.html`).
- [ ] [H] Confirm the in-app account-deletion flow design and its retention/recover contract.
- [ ] [H] Counsel UPL / disclaimer review of all store copy (no "legal advice" claims).
- [ ] [H] Final age rating + export-compliance encryption declaration sign-off.
- [ ] [H] App Store Connect / Play Console account ownership, signing, and submission.
- [ ] [H] Handle review rejections / back-and-forth for both apps.

## Decisions required before building

1. Legal entity + Privacy Officer of record (blocks every store account field and the
   privacy labels). `privacy.html` still carries `[entité responsable du traitement à confirmer]`.
2. Account-deletion architecture and retention policy (App Store hard requirement).
3. Counsel's accepted phrasing for the disclaimer and any limits on describing the service.
4. Export-compliance posture for the offline cache (exempt vs. self-classification report).
5. Which org owns the developer accounts and signing identities for each app.

## First safe slice

Land one repo-local artifact that needs no store account, no native build, and no counsel
sign-off to merge (it is reviewed copy, not a published claim):

`docs/store/disclaimer.md` (future PR) — the canonical disambiguation paragraph in FR and EN,
derived verbatim from the existing `index.html` JSON-LD `description` and `privacy.html` framing,
flagged `DRAFT — counsel review required before any store submission`. Both app submissions and
this site's footer then reference one source, eliminating drift. This slice:
- changes no gate flag, no `lib/version.ts`, no attestation;
- adds no migration;
- is additive documentation only, consistent with `OPERATING_CANON.md` (agents prepare copy,
  humans/counsel approve legal posture before it ships).

After that slice merges, the next agent-safe step is the metadata + Data Safety / Nutrition
tables drafted into `docs/store/`, still gated on the `[H]` items above.
