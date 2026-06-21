# Issue #416 — [epic] Product polish: ServiceFunnel checkout, "coming soon" states, locked modules

**Mode:** PLAN (epic / human-gated). This document is the deliverable. It does **not** build the
feature. It scopes the work, breaks it into safe sub-tasks, surfaces the decisions a human / counsel /
architect must make, and identifies the first safe slice.

## 1. Context & repo reality check

This repository (`annoncedenounce.com`) is the **public static launch site** — plain
HTML/CSS plus a thin Vercel `api/version.js` handler and version/verify governance scripts. It is
**not** the product application. There is currently no application runtime here: no React/Next app, no
router, no `ServiceFunnel` component, no checkout, no module registry, no feature-flag system.

The epic's concepts — *ServiceFunnel checkout*, *"coming soon" states*, *locked modules* — are
**product-application** concepts. The canon (`docs/OPERATING_CANON.md`) names **`juge.ca`** as the
reference implementation; that (or a future app surface) is where the funnel, checkout, and module
gating live. Today, this repo's only manifestation of the epic is the single **"Bientôt en ligne"**
(coming soon) marketing state on the landing page (`index.html`, around the eyebrow `Bientôt en ligne`)
and the waitlist/HubSpot lead capture.

**Therefore this epic spans more than one surface.** The plan below separates:
- **Track A** — what can land *in this repo* now (landing-page coming-soon / waitlist polish, copy,
  governance) without product-runtime or compliance risk.
- **Track B** — the product-application work (funnel, checkout, locked modules) that requires the app
  repo, architecture sign-off, and — critically — monetization/compliance decisions that this
  autonomy loop is explicitly forbidden from making (see HARD RULES: never flip
  monetization/compliance gate flags or attestations).

## 2. Scope

### In scope (this epic, across both tracks)
- A consistent, accessible **"coming soon"** treatment for not-yet-launched services/modules
  (visual state + copy + analytics signal), bilingual (FR primary, EN).
- A **`ServiceFunnel` checkout** flow: service selection → details → confirm → payment → receipt,
  with clear states for unavailable steps.
- **Locked modules**: a way to present modules that exist but are gated (by edition / jurisdiction /
  entitlement / launch phase), with a non-dead-end CTA (waitlist, notify-me, or upgrade path).

### Explicitly out of scope (for any autonomous slice)
- Turning on payments / activating Stripe (or any PSP) live keys or capture.
- Flipping any monetization, compliance, jurisdiction, or attestation **gate flag** to "enabled".
- Editing `lib/version.ts` / version metadata as part of feature work.
- Any change to legal pages (`privacy.html`), right-of-reply, takedown, or moderation posture — these
  are human/legal-review-gated per the Operating Canon.
- Non-additive migrations (when the app DB exists, migrations are additive-only, next free number).

## 3. Sub-task checklist

### Track A — landing site (this repo, low risk, can start now)
- [ ] A1. Inventory the current "Bientôt en ligne" coming-soon block in `index.html`; document its
      copy, markup, and a11y state (focus, contrast, semantics).
- [ ] A2. Define a single, reusable **coming-soon / locked** visual pattern (badge + short copy +
      one CTA → waitlist) so future not-yet-live items look consistent. Static-site-friendly
      (HTML/CSS only; no framework).
- [ ] A3. Bilingual copy (FR canonical, EN) for: "coming soon", "locked / requires <edition>",
      "notify me / join waitlist". No new placeholders that would trip `verify-site.mjs`.
- [ ] A4. Wire the locked/coming-soon CTA to the **existing** consent-gated waitlist path (HubSpot
      portal `43986063` + first-party email fallback) — reuse, do not add a second capture system.
- [ ] A5. Run `npm run verify` (the static gate: version lockstep, footer version, required assets,
      `/api/version`, no placeholders). Must stay green.

### Track B — product application (app repo; architecture + counsel gated; NOT this autonomy slice)
- [ ] B1. Confirm the **target app surface** (juge.ca app vs. a new app surface) and where
      `ServiceFunnel` should live. **Architecture decision required.**
- [ ] B2. Define the **module/entitlement model**: what "locked" means (edition, jurisdiction,
      entitlement, launch phase) and where the source of truth lives (config vs. DB).
- [ ] B3. Define funnel state machine: `select → details → review → pay → receipt`, plus
      `unavailable`, `coming-soon`, and `locked` terminal/branch states.
- [ ] B4. Checkout integration design — **read-only / test-mode first.** No live PSP activation, no
      gate-flag flips. Reuse any existing payments plan (see Related work below) rather than
      re-deciding posture.
- [ ] B5. Accessibility + i18n contract for every funnel/locked state (FR/EN, keyboard, SR labels);
      where the app has locale checks, plan to run `npm run check:locales`.
- [ ] B6. Analytics/observability for funnel drop-off and "locked" CTA clicks (cookieless where the
      visitor has not consented, consistent with Loi 25 / RGPD posture).
- [ ] B7. Additive-only migration(s) for any persisted entitlement/funnel state, next free number,
      behind a default-off flag (flag flip is a **human** decision, not part of the build slice).

## 4. Decisions required before Track B can be built (human / architecture / counsel)

1. **Surface ownership (architecture):** does `ServiceFunnel` live in the `juge.ca` app, a new
   product app, or is part of it embedded into this site? This determines the whole epic's home.
2. **Monetization posture (human + counsel):** which services are paid, in which editions /
   jurisdictions, and when checkout may go **live**. The autonomy loop must not flip the
   monetization/compliance gate or attestations — a human owns activation.
3. **"Locked" semantics (architecture + product):** edition- vs. jurisdiction- vs. entitlement- vs.
   phase-based gating, and the source of truth. Affects data model and copy.
4. **Compliance review (counsel):** any service that touches evidence, allegations, takedown, or
   identifiable parties is legal-review-gated per the Operating Canon. Counsel must confirm the
   funnel copy and any pre-purchase disclosures.
5. **Payments provider & go-live gate (human):** which PSP, test vs. live, and the explicit
   activation gate. Build proceeds in **test mode only** until a human flips it.

## 5. First safe slice (recommended next implementable PR)

**Track A, sub-tasks A1–A5: a reusable, accessible, bilingual "coming soon / locked" pattern on the
landing site that reuses the existing consent-gated waitlist as its only CTA.**

Why this is the safe first slice:
- It is entirely within this static repo — no app runtime, no payments, no gate flags, no migrations.
- It improves the one product-polish surface that actually exists here today (the
  "Bientôt en ligne" state) and gives every future locked/coming-soon item a consistent home.
- It cannot affect monetization or compliance posture, so it does not trip any HARD RULE.
- It is verifiable with the existing `npm run verify` gate and adds no new placeholders.

Everything else (the actual `ServiceFunnel` checkout and locked-module runtime) is **Track B** and
must wait on the §4 decisions and the correct app repo. This doc is the gate record for that.

## 6. Related open planning work (avoid duplication)

Several adjacent epics/plans are already in flight as `issue-NNN` PRs and should be the source of
truth for shared posture rather than re-decided here:
- **#440** — audit of "coming soon" provider/service states (directly overlaps Track A inventory).
- **#442** — edition-purity pass on Quebec funnel copy (overlaps funnel copy / edition gating).
- **#422 / #446 / #449** — Stripe Connect / payouts / payout runbook & tax posture (checkout
  go-live posture — Track B B4/B5 should consume these, not re-decide).
- **#417 / #450 / #455 / #456** — per-edition / jurisdiction launch-gate templates (locked-module
  gating semantics — Track B B2/B3).

The checkout/locked-module build slices in Track B should explicitly reference these so the epic does
not fork monetization or jurisdiction-gating decisions.
