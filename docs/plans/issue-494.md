# Issue #494 — `[ux] uiux-flawless-flow audit — usability findings`

> Status: **PLAN / disposition** (cannot be implemented in this repository).

## TL;DR

Issue #494 is a **`juge.ca`** (Next.js app) issue. This worktree is the
**`annoncedenounce.com`** repository — a small, static, French-language launch
/ landing site (`index.html`, `privacy.html`, plus version + CI plumbing). The
files the audit calls out (`components/AuthForm.tsx`, the `HomeLanding` dual
CTAs, account-type labels, the marketplace, the intake flow, password rules)
**do not exist in this repository** and cannot be created here without inventing
an entirely new application, which would violate the issue's "smallest correct
change" and "touch only files relevant to this issue" rules.

This doc records that disposition so the issue carries a PR and the next
operator has the full context.

## Why this repo is not the target

Evidence gathered while scoping:

- `gh issue view 494` against this repo (`PresidentAnderson/annoncedenounce.com`)
  fails: *"Could not resolve to an issue or pull request with the number 494."*
  The issue only resolves in `PresidentAnderson/juge.ca`.
- The setup step symlinks `node_modules` from
  `/Users/presidentanderson/Documents/Claude/Projects/juge.ca/node_modules` —
  i.e. the task's dependency source is the `juge.ca` project, not this one.
- `git ls-files` here lists 25 files: static HTML, `assets/`, `scripts/`,
  `.github/workflows/`, `version.json`. There is **no** `components/`,
  no `AuthForm.tsx`, no `HomeLanding`, no TSX, no Next.js app.
- The only form in this site (`#fallback-form` in `index.html`) is already
  accessible: it uses `<label for="email">`, `id="email"`, `autocomplete="email"`,
  and `inputmode="email"` — i.e. it already satisfies the spirit of the audit's
  top "HIGH" finding (AuthForm autofill + screen-reader support).

## Upstream status (from the issue's own comments, `juge.ca`)

The issue owner has already resolved most of the audit upstream:

| Audit item | Upstream status |
|---|---|
| AuthForm a11y / `autoComplete` / `<label htmlFor>` | Fixed in 7.27.13 |
| Account-type jargon ("Litigant", "Commissioner for oaths") | Already plain-language on `main` |
| Competing hero CTAs / auth-bypass | hero → `/login?mode=signup`; `/app` auth-gated |
| Password rules shown as hints first | Fixed in 7.27.13 |
| Intake court-type step has no guidance | Fixed in 7.27.22 |
| Marketplace verified-provider CTA dead-end | Overlaps marketplace cluster #499 |

Remaining genuinely-open items are all `juge.ca`-specific copy / brand judgment
(services-strip outcome language, password-rules contrast + 44px touch targets,
the "🚧 in active development" hero badge).

## Sub-task checklist (to be executed **in `juge.ca`**, not here)

- [ ] Re-run the `uiux-flawless-flow` audit against current `juge.ca main` to
      confirm the 7.27.13 / 7.27.22 fixes closed the HIGH items.
- [ ] Services strip: replace pro jargon ("assermentation", "signification")
      with outcome language (e.g. "get a document sworn / served").
- [ ] Password-rule hints: verify contrast ratio ≥ 4.5:1 and touch targets ≥ 44px.
- [ ] Decide on the "🚧 in active development" hero badge (keep vs remove).
- [ ] Marketplace verified/unverified provider CTA → fold into #499.
- [ ] Close #494 (or convert remaining items into a thin follow-up) once verified.

## Decisions required (human / brand / architecture)

1. **Repo routing** — Confirm #494 should be worked in `juge.ca`. The autonomy
   loop spawned an `annoncedenounce.com` worktree for a `juge.ca` issue; the
   spawn target needs correcting so future runs land in the right repo.
2. **Copy / brand** — outcome-language rewrites and the hero badge are brand
   voice calls, not mechanical fixes; they need owner sign-off.
3. **De-dup with #499** — agree the marketplace item lives in #499, not #494.

## First safe slice (when correctly targeted at `juge.ca`)

The smallest correct production change is the services-strip copy swap
(pro jargon → outcome language) plus the password-rule contrast / touch-target
polish — both localized, low-risk, and trilingual (en/fr/es, no English
fallback on `/es`), matching the project's existing i18n conventions. Everything
else is either already shipped or belongs to #499.

## Disposition for this repository

No code change is correct in `annoncedenounce.com` for this issue. This PR
carries only this plan doc (Refs #494) so the issue has a tracked PR and the
mismatch + remaining upstream work are documented for the next operator.
