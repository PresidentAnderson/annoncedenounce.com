# Plan — Issue #502: [i18n] i18n-qa — English-fallback on /es + hardcoded strings

Refs #502

## Status: Blocked-as-written — repository mismatch

Issue #502 describes an i18n QA defect in a **multi-locale Next.js application**:

- an English fallback leaking onto Spanish (`/es`) routes, and
- hardcoded UI strings that bypass the translation layer,
- with a `npm run check:locales` validator expected to pass.

That feature surface **does not exist in this repository**
(`PresidentAnderson/annoncedenounce.com`). This repo is a single-page
**static HTML launch site**, French-only by design:

| Issue premise | Reality in this repo |
| --- | --- |
| `/es` Spanish route | No locale routing; one `index.html` |
| `/fr`, `/en` locales + fallback chain | `<html lang="fr">`, `og:locale="fr_CA"`, manifest `"lang": "fr"` |
| Locale JSON / message catalogs | None — copy is inline French in `index.html` |
| `npm run check:locales` script | Not defined in `package.json` |
| Translation framework (next-intl / i18next) | None installed |

The issue was almost certainly authored against the sibling **juge.ca**
Next.js codebase (whose `node_modules` this worktree symlinks for tooling),
not against this static site. Implementing "fix the /es English fallback"
here is impossible because there is no `/es`, no English, and no fallback
machinery to fix.

Per the task fallback rule, this PR ships the plan doc so the issue carries
a PR, rather than fabricating an unrelated change.

## Scope (if/when i18n is genuinely introduced here)

The smallest correct path to multilingual support for this static site,
should the product decide to add it. None of this should be built
speculatively — it is gated on the product decisions below.

### Sub-task checklist

- [ ] Decide the locale set and URL strategy (see decisions below).
- [ ] Extract inline French copy from `index.html` into a single source of
      truth (e.g. `locales/fr.json`) keyed by stable string IDs. Cover
      visible text **and** the user-facing attributes already present:
      `aria-label`, `alt`, `placeholder`, `title` (13 such attributes today,
      e.g. lines 957, 961, 1105, 1111, 1151 of `index.html`).
- [ ] Add `locales/<lang>.json` per target locale with the **same key set**.
- [ ] Add a build step that renders one static HTML page per locale from a
      template + the locale JSON (keeps the site static — no runtime i18n
      framework needed for a launch page).
- [ ] Set the correct `<html lang>`, `<meta property="og:locale">`, and
      `site.webmanifest` `"lang"` per generated page.
- [ ] Emit `<link rel="alternate" hreflang="...">` tags (and `x-default`)
      across locales for SEO.
- [ ] Update `sitemap.xml` and `robots.txt` to include every locale URL.
- [ ] Add `npm run check:locales`: fails if any locale JSON is missing a key
      present in the reference locale, or contains an untranslated value
      identical to the reference (the real anti-pattern #502 targets).
- [ ] Wire `check:locales` and the render step into `scripts/verify-site.mjs`
      and the `ci.yml` workflow.

## Decisions required before any code

1. **Product / business:** Is this static launch site meant to be
   multilingual at all, and which locales? (The issue implies `es`; the site
   today is `fr` only and Québec-focused.) This is the gating decision.
2. **Architecture:** URL strategy — subpath (`/es/`, `/fr/`), subdomain, or
   `Accept-Language` redirect via `vercel.json`. Affects sitemap, hreflang,
   and `vercel.json` routing.
3. **Architecture:** Static-render-per-locale (recommended for a launch page)
   vs. introducing a runtime i18n framework. The former keeps the current
   zero-dependency static deployment; the latter is heavier and likely
   unwarranted for one page.
4. **Counsel / compliance:** The site handles a public-interest reporting /
   "dénonciation" flow with a privacy page and consent banner. Any
   translated legal copy (`privacy.html`, consent text, trust commitments)
   needs review before publication — translation here is a legal artifact,
   not just UI copy.
5. **Triage:** Confirm whether #502 should instead be retargeted/closed
   against the juge.ca repository, where the `/es` fallback and
   `check:locales` actually live.

## First safe slice

Recommendation: **retarget #502 to the juge.ca repo** where the described
defect actually exists.

If multilingual support for *this* site is confirmed (decision #1), the first
safe, reversible slice is **string externalization with zero behavior change**:
extract the inline French copy (text + the 13 user-facing attributes) from
`index.html` into `locales/fr.json` and render the existing French page from
it. This introduces the single-source-of-truth and the `check:locales`
validator without yet shipping a second language — establishing the
infrastructure the issue assumes, while the still-French output keeps the
slice fully verifiable and safe to land.
