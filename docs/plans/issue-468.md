# Plan — Issue #468 (epic): Universal accessibility & 200-language reach

Status: PLAN (epic / human-gated). This document is the deliverable. Do **not**
build the feature from this PR. Refs #468.

> Note: issue #468 does not resolve against this repository
> (`PresidentAnderson/annoncedenounce.com` currently has only issue #1). The
> number is carried from the sister reference repo (`juge.ca`, the source of the
> shared `node_modules`). This plan therefore grounds the epic in the **actual
> state of this repo** — a single static `index.html` launch page — rather than
> in juge.ca's app architecture. Re-scope the slices below once a matching
> tracking issue exists here.

## 1. Scope

**Goal (epic):** make Annonce Dénonce reachable and usable by speakers of up to
~200 languages, accessible to assistive-technology users, and correct for
right-to-left (RTL) scripts — while never presenting machine-translated legal,
safety, or whistleblower-facing copy as if it were authoritative. Translation
that is machine-generated must carry visible **provenance** (who/what translated
it, when, and that it is unofficial).

**Today's reality (what we are starting from):**

- One static page: `index.html`, `<html lang="fr">`, French copy with a single
  English tagline ("Announce. Denounce. Be heard.").
- A legal page `privacy.html` (French) and an SEO surface: `sitemap.xml`,
  `robots.txt`, `site.webmanifest`, JSON-LD in `index.html`.
- No build step, no framework, no bundler. Hosting is Vercel static + one
  function `api/version.js`. Verifier: `scripts/verify-site.mjs`
  (`npm run verify`). There is **no** TypeScript, no i18n tooling, and no
  `check:locales` / `tsc` in this repo — those gates apply to juge.ca, not here.
- Existing a11y foundations already present and worth preserving: skip links,
  `aria-live` regions, `aria-label`ed nav, visible focus styles,
  `prefers-reduced-motion` handling, 48px touch targets.

**In scope for the epic**

- Accessibility hardening to WCAG 2.2 AA across all shipped pages.
- A locale model: per-locale content, correct `lang`/`dir`, language switcher,
  hreflang/SEO, and locale-aware metadata.
- RTL-first layout correctness (logical CSS properties, mirrored UI).
- Machine-translation pipeline **with provenance** and a human-authoritative tier
  for legal/safety copy.
- Governance: which strings may be machine-translated vs. must be human-reviewed.

**Explicitly out of scope (here)**

- Translating the future reporting/evidence product (does not exist yet).
- Picking a paid MT vendor or signing a data-processing agreement (counsel +
  procurement decision; see §3).
- Auto-publishing machine translations of legal pages without human sign-off
  (forbidden by `docs/OPERATING_CANON.md` — legal/privacy copy is human-gated).

## 2. Sub-task checklist (concrete, ordered)

### A. Foundations (safe, no vendor, no legal exposure)
- [ ] **A11y audit** of `index.html` + `privacy.html`: run axe / Lighthouse,
      record contrast, heading order, form labels, focus order, target sizes.
      Output: a tracked checklist of concrete fixes (not a rewrite).
- [ ] **Logical-property migration** in CSS: replace `left/right`, `margin-left`,
      `padding-left`, `text-align: left`, fixed `left:` offsets, and the
      `transform: translateX(-50%)` banner anchors with
      `inset-inline-*` / `margin-inline-*` / `text-align: start` so layout is
      direction-agnostic. This is the prerequisite for RTL and is independently
      shippable.
- [ ] **Define the locale content model.** Decide source of truth for strings.
      Options to evaluate (decision = §3.1):
        1. Per-locale static HTML files (`/`, `/en/`, `/ar/` …) generated from a
           JSON message catalog by a tiny build script (fits "no framework").
        2. A single page + runtime JSON dictionary swapped client-side
           (worse for SEO/no-JS; likely rejected).
      Recommend option 1 (SEO-correct, no-JS-safe, cache-friendly).

### B. Locale plumbing
- [ ] Message catalog: `locales/<bcp47>.json` keyed by stable string IDs;
      `en` + `fr` authored by hand as the human-authoritative baseline.
- [ ] Build/generate per-locale pages with correct `<html lang>` **and** `dir`
      (`ltr`/`rtl`/`auto`), localized `<title>`, `meta description`, OG/Twitter
      `og:locale`, and JSON-LD `inLanguage`.
- [ ] `hreflang` alternates + `x-default`, per-locale `sitemap.xml` entries,
      canonical URLs. Update `robots.txt` if path scheme changes.
- [ ] Accessible **language switcher** (real `<a>`/`<select>` with labels,
      `lang` attribute on each option, no JS dependency for the core path).
- [ ] Extend `scripts/verify-site.mjs`: assert every locale page has matching
      `lang`+`dir`, non-empty translated `<title>`/description, present hreflang,
      and that no untranslated placeholder string ships.

### C. Machine translation **with provenance**
- [ ] Tiering policy doc: tier 0 = human-authoritative (legal, privacy, safety
      warnings, the "this is not a secure channel" notice); tier 1 =
      machine-translated-then-human-reviewed; tier 2 = machine-translated
      marketing copy. Tier 0 strings may **never** be auto-MT'd.
- [ ] Provenance metadata per string/locale: `{ source, engine, model,
      translatedAt, reviewedBy|null, status }` stored alongside the catalog.
- [ ] Visible provenance UI: a per-page banner / `aria` note when a page is
      shown in a machine-translated locale ("Traduction automatique — non
      officielle"), localized, dismiss-optional, never covering tier-0 copy.
- [ ] Offline MT generation step (script writes catalogs + provenance); the site
      ships static output. No third-party MT script runs in the visitor's
      browser (keeps the cookieless/first-party posture intact).
- [ ] Fallback chain: requested locale → human baseline (`fr`/`en`) →
      `x-default`; never blank.

### D. Governance & QA
- [ ] CONTRIBUTING note: how to add a locale, what's tier-0, who reviews.
- [ ] CI/verifier gate: fail if a tier-0 string is marked machine-translated, or
      if a locale is missing provenance.
- [ ] RTL visual QA on at least one RTL locale (Arabic) before any RTL launch.

## 3. Decisions required (human / architecture / counsel)

1. **Architecture — rendering model.** Static per-locale page generation (adds a
   build step to a currently build-free repo) vs. runtime client swap. Owner:
   maintainer. Recommendation: static generation.
2. **Counsel — legal copy.** Confirm legal/privacy/right-of-reply text is
   **human-translated and human-approved per jurisdiction**; machine translation
   of these is prohibited for publication. Owner: legal (Justice Sans Frontières
   Canada / counsel). Per `OPERATING_CANON.md`, privacy/legal changes are
   human-gated.
3. **Procurement / privacy — MT vendor.** Which engine (e.g. self-hosted vs.
   cloud), and a data-processing posture that keeps **whistleblower-facing copy**
   from leaking sensitive context to a third party. Run MT **offline at build
   time** so no user input is sent anywhere. Owner: maintainer + privacy/DPO.
4. **Product — language set.** Which of the ~200 languages launch first, in what
   order, and the bar for "good enough" per tier. Owner: product.
5. **Brand — provenance wording & placement** in each locale. Owner: product +
   counsel (must not imply official endorsement of a machine translation).
6. **Scope of "200".** Confirm 200 is a north-star, not a launch gate; define the
   launch subset (likely FR/EN authoritative + a small reviewed set first).

## 4. First safe slice (this PR carries only the plan)

The smallest correct, independently-shippable first slice — proposed for a
**separate** follow-up PR, not this one:

> **Slice 1 — Direction-agnostic CSS + a11y audit fixes (no new locales, no MT,
> no vendor, no legal exposure).**
> Convert physical CSS properties in `index.html` to logical properties
> (`inset-inline`, `margin-inline`, `padding-inline`, `text-align: start`) and
> apply the concrete WCAG 2.2 AA fixes found in the audit. This makes the page
> RTL-ready and more accessible **without** changing copy, adding pages, or
> introducing any translation tooling — so it needs no counsel sign-off and
> cannot regress the legal posture. Gate: `npm run verify` plus a manual
> `dir="rtl"` smoke test on `index.html`.

Slice 2 (next): introduce the `locales/` catalog + generator for **FR/EN only**
(both human-authored), per-locale pages, hreflang, switcher, and verifier
assertions — still zero machine translation. MT-with-provenance (section C)
comes only after decisions §3.2 and §3.3 are resolved.
