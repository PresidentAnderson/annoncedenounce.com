# Plan — Issue #495: product-design-visionary — brand elevation direction

Status: PLAN (design direction / human-gated). Do not auto-build.
Filed: 2026-06-21. Mode: design plan only — the doc is the deliverable.

## 0. Repository / issue scope note (read first)

Issue #495 does **not currently resolve** in either tracked repository:

- `gh issue view 495` in `PresidentAnderson/annoncedenounce.com` returns
  `Could not resolve to an issue or pull request with the number of 495.`
- The repo's only native issue is #1; the higher numbers in flight (#501, #502,
  #550) are mirrored design/plan issues whose builds may target
  `PresidentAnderson/juge.ca` (see `docs/OPERATING_CANON.md`, which names juge.ca
  as the reference implementation).

Because the task is a **brand / product-design direction** ("brand elevation
direction"), it is inherently a design artifact, not a code change. Per the
operating canon, autonomous agents "may work only through issues that have a
`priority:*` label, explicit acceptance criteria, and a PR through the review
gate" — none of which an unresolvable issue provides. This plan is therefore the
correct, conservative deliverable: it captures the brand-elevation direction so a
human can ratify it before any visual code is touched.

**Human decision required:** confirm where #495 should be tracked (this repo vs.
juge.ca), attach acceptance criteria + a `priority:*` label, and approve the
direction below before any `index.html` / `privacy.html` styling is changed.
No production markup, styles, or assets are changed in this PR.

## 1. Scope

"Brand elevation" for Annonce Dénonce means raising the launch site from a
competent dark landing page to a coherent, trust-first brand system that reads
as credible to people about to disclose sensitive, public-interest information —
without losing the sober, evidence-first posture the canon requires.

Today's brand surface (single static page, `index.html`):

- **Palette tokens** (in `:root`): `--bg #071017`, `--bg-2 #0e1b22`,
  `--ink #f7f4ed`, `--muted #b9c4c2`, `--paper #fffaf0`, accent
  `--brand #f45b69` / `--brand-2 #c83d4b`, `--teal #4ecdc4`, `--gold #ffd166`.
- **Type**: Sora (display, h1–h3) + Inter (body), loaded from Google Fonts.
- **Wordmark**: an `AD` "mark" + "Annonce Dénonce" text, repeated in header and
  footer. No standalone logo file; favicon doubles as the org logo in JSON-LD.
- **Imagery**: one hero photo (`assets/hero-dossier.png`) used as a fixed,
  heavily-overlaid background and as the OG/Twitter image (1800×1100).
- **Voice**: bilingual FR-lead ("Dénoncer. Être entendu." / "Announce.
  Denounce. Be heard."), restrained, public-interest framing.

In scope for elevation: a documented token/scale system, a defined wordmark +
logo lockup, an imagery & iconography direction, accessibility-graded color
contrast, an OG/share-image system, and a motion/interaction tone. Out of scope:
any new product feature, any new page, any AI/legal copy decisions.

## 2. Sub-task checklist (build order)

Ordered so the design system is defined and human-approved before any pixel
ships, and so each slice is independently reviewable.

### Foundation (define the system — docs first, no site code)
- [ ] Audit current tokens and record the *intended* semantic roles (surface,
      ink, accent, status) vs. the current literal hex names. All four accent
      tokens are in use (`--brand` ~4×, `--teal` ~9×, `--gold` ~11×) but with no
      documented semantic meaning — decide which is primary vs. secondary vs.
      status, and which are functional (e.g. focus, success) vs. decorative.
- [ ] Define an accessible color system: verify every text/background pairing
      against WCAG AA (4.5:1 body, 3:1 large). Flag any accent-on-dark or
      muted-on-dark pair that fails and propose the corrected token value.
- [ ] Define the type scale (modular scale + responsive clamps) and the exact
      Sora/Inter weights to keep (drop unused weights to trim the font request).
- [ ] Define spacing, radius, border, and elevation tokens as named CSS custom
      properties (today these are inline literals scattered in the `<style>`).

### Identity (wordmark + logo)
- [ ] Specify the `AD` monogram + wordmark lockup: clear-space, min sizes,
      mono/inverted variants, and an SVG source of truth in `assets/`.
- [ ] Produce a real logo asset (SVG + PNG) so JSON-LD `logo`, the apple-touch
      icon, and `site.webmanifest` icons stop reusing the favicon. HUMAN/BRAND
      GATE: final mark approval.

### Imagery & iconography
- [ ] Define the photography/illustration direction (the "dossier" motif):
      treatment, overlay recipe, and acceptable subject matter for a
      trauma-aware, evidence-first product (no sensationalism).
- [ ] Define an icon set direction for the Signaler / Documenter / Protéger
      cards and trust row (currently text-only) — consistent stroke + grid.

### Share / OG system
- [ ] Define a templated 1200×630 OG/Twitter image system (the canonical share
      ratio) with the wordmark + tagline, so social cards are on-brand and
      correctly sized. NOTE: PR #501 (`issue-501`) is already adding a 1200×630
      OG image + hreflang; coordinate token/wordmark usage with it to avoid
      conflicting share assets.

### Motion & interaction tone
- [ ] Define the interaction posture: hover/focus states, reduced-motion
      behavior, and the restraint level appropriate to a sensitive-disclosure
      product (calm, no attention-grabbing animation).

### Ship slice (only after §3 approval)
- [ ] Apply the approved token system to `index.html` (+ `privacy.html`) as a
      pure token/CSS refactor — same content, same DOM, no copy changes —
      verified by `npm run verify` and visual review.

## 3. Human / architecture / counsel decisions required

1. **Issue resolution** — confirm #495's home repo, acceptance criteria, and
   `priority:*` label (see §0). Blocks everything; agents can prepare, not decide.
2. **Brand mark approval** — the `AD` monogram + final logo asset is a brand
   decision a human must sign off (identity, not code).
3. **Accent posture** — keep the coral `--brand #f45b69` as primary, or move to a
   more institutional/credible accent? Coral reads urgent/alarm; for an
   evidence-first, trust-first product that may be a feature or a liability.
   Product + brand decision.
4. **Tone vs. trust trade-off** — how expressive may motion/imagery be without
   undermining the sober, trauma-aware posture the canon mandates? Product +
   (for any victim-facing language implications) counsel-adjacent review.
5. **Bilingual brand hierarchy** — FR-primary is set; ratify how EN appears in
   the wordmark/taglines and share images so it's consistent system-wide.
6. **Coordination with in-flight PRs** — #501 (OG image + hreflang) and #502
   (i18n /es fallback) touch brand-adjacent surfaces; sequence the token
   refactor so it does not collide. Architecture/maintainer call.

## 4. First safe slice

The smallest correct, reviewable first build — and the only one allowed without
a human visual sign-off — is **a non-visual token + accessibility audit**: a
follow-up doc (or this doc's §2 Foundation items) that (a) names every existing
color/type/space literal in `index.html`, (b) maps it to a semantic token, and
(c) records the WCAG AA contrast result for each text/background pair, flagging
fails with a proposed corrected value. This:

- changes no shipped pixels (pure analysis), so it cannot regress the live site,
- produces the evidence needed to make the §3 accent/contrast decisions with
  real numbers instead of taste,
- becomes the spec for the eventual pure-CSS token refactor (the ship slice),
- and is fully compatible with the operating canon's "smallest coherent change"
  + `npm run verify` gate.

Everything that changes the rendered brand — new logo asset, new accent, new
imagery, new OG template, the CSS refactor — stays behind the human/brand gates
in §3.

## 5. Out of scope / hard rules respected

- No edits to release metadata in lockstep files beyond what `npm run version:bump`
  would do; this PR changes none of them. No `lib/version.ts` exists in this repo,
  so it is trivially untouched.
- No monetization/compliance gate-flag or attestation flips; no auth, evidence,
  moderation, legal, privacy, right-of-reply, or takedown copy is changed.
- No migrations (this is a static site; none apply).
- This PR adds only this plan doc — no brand markup, styles, or image assets.

Refs #495
