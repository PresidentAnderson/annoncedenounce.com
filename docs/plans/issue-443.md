# Plan — Issue #443: Fee/referral engine (configurable, draft model)

Parent epic: **#413** (Marketplace monetization — counsel-approved fee/referral model + payout operations).

> Status: **PLAN** (this PR ships the plan only). See "Repository routing note" below — the
> implementation surface for this feature lives in the `juge.ca` application repo, not in this
> `annoncedenounce.com` static launch site. This PR is filed here so the issue has a tracked PR
> and a vetted plan; the code lands in `juge.ca` once routed correctly.

## Repository routing note (read first)

Issue #443 belongs to the `PresidentAnderson/juge.ca` application repo (TypeScript / Next.js /
Supabase). It is referenced from `annoncedenounce.com` because this static site lists `juge.ca`
as its "reference implementation" in `docs/OPERATING_CANON.md`. This static repo has **no
marketplace, payments backend, config system, feature-flag layer, or migrations** — so the fee
engine cannot be implemented here.

Concretely, the relevant `juge.ca` surfaces already exist:

- Gate flag: `attorneyMarketplaceMonetizationEnabled()` in `lib/legal/attorney-marketplace-policy.ts`
  — requires both `ATTORNEY_ETHICS_MEMO_APPROVED` and `ATTORNEY_MARKETPLACE_MONETIZATION_LIVE`.
- Policy guardrail: `ATTORNEY_MARKETPLACE_POLICY` (same file) — `status: "blocked_pending_counsel"`,
  `currentFeeModel: "professional_saas_subscription"`, with `blockedFeeModels` enumerated.
- Marketplace libs: `lib/marketplace/` (taxonomy, providers, engagement, scope).
- Referral system already present: `lib/growth/referrals.ts`, `lib/growth/referral-acceptance.ts`,
  `app/api/referrals/{accept,me}/route.ts`, `app/[lang]/r/[code]/route.ts`.
- Test-mode helper: `isTestMode()` (used across `lib/service/stripe.ts` and checkout gating).
- Migrations: sequential under `supabase/migrations/`; latest is `0066_site_presence.sql`, so the
  next free number is **0067**.

All file paths in the slices below are **`juge.ca`-relative**.

## Scope

Build a **configurable, edition-aware fee schedule + referral logic** with a **draft default
model**. The engine must:

1. Compute fees correctly **in test mode from a config** (acceptance criterion).
2. Keep the live monetization flag **off pending counsel sign-off** (acceptance criterion).
3. Reject `blockedFeeModels` (percentage-of-legal-fee, success fee, unapproved per-lead/per-matter)
   structurally, not just by policy text — the type system / validation should make an unapproved
   model unrepresentable while the flag is off.

### Explicitly out of scope (other #413 children)

- Provider payouts / Stripe Connect transfers (#59 / sibling issues).
- Tax / 1099 / T4A reporting.
- Checkout funnel fee disclosure UI (#383 / #384) — this issue produces the *engine* the funnel
  will consume; the UI surfacing is a separate child.
- Flipping `ATTORNEY_MARKETPLACE_MONETIZATION_LIVE` (human/counsel gate — never done by an agent).

## Sub-task checklist

- [ ] **Config schema** — define an edition-aware, per-service fee schedule type (e.g.
  `lib/marketplace/fees/schedule.ts`). Model: flat platform fee, per-edition overrides, optional
  fixed referral credit. **No** percentage-of-legal-fee field exists in the type.
- [ ] **Draft default config** — ship a `DRAFT` schedule (clearly labelled `draft: true`,
  `approved: false`) with placeholder rates. Document that real rates land from counsel before
  activation (per #413 CTO note).
- [ ] **Fee computation** — pure function `computeFees(input, schedule)` returning a deterministic
  breakdown (subtotal, platform fee, referral credit, total). Currency-safe (integer minor units).
- [ ] **Referral logic** — given an attributed referral (reuse `lib/growth/referrals.ts`
  attribution), compute the fixed referral credit/payable per the schedule. Fee-splitting with
  non-lawyers stays structurally impossible (no % model).
- [ ] **Gating** — `computeFees` is callable in test mode for verification, but any path that would
  *charge or pay out* under the schedule must short-circuit unless
  `attorneyMarketplaceMonetizationEnabled()` is true. While the flag is off it stays a pure
  calculator / dry-run.
- [ ] **Validation guard** — runtime validator rejecting any schedule whose model intersects
  `ATTORNEY_MARKETPLACE_POLICY.blockedFeeModels`; unit-tested.
- [ ] **Persistence (optional, additive only)** — if the schedule must be stored rather than coded,
  add migration `supabase/migrations/0067_marketplace_fee_schedule.sql` (additive table, RLS,
  `draft`/`approved` columns). Additive-only; next free number is 0067.
- [ ] **Tests** — fee math fixtures (per service × per edition), referral credit math, blocked-model
  rejection, and a test asserting the live flag is **off by default** in the test env.
- [ ] **i18n** — if any user-facing fee labels are introduced, add keys to all locales and run
  `npm run check:locales`. The engine itself should be locale-agnostic.

## Decisions required (human / architecture / counsel)

- **[H/counsel]** Approve the attorney fee/referral model vs UPL + bar advertising / referral-fee /
  fee-splitting rules per jurisdiction (`launchJurisdictionsRequiringMemo`: QC, CA, NY, NJ, CT,
  US-federal). **Required before COMMERCIAL ACTIVATION**, not before building (#413 CTO note,
  2026-06-19).
- **[H/architecture]** Config-as-code vs DB-backed schedule. Default to **config-as-code** for the
  draft (simpler, reviewable in PR, no migration); add the DB table only if ops needs to edit rates
  without a deploy.
- **[H/architecture]** Edition taxonomy source of truth — confirm the edition enum the schedule keys
  on matches the existing marketplace edition model.
- **[H]** Numeric posture — currency, rounding, minor-units convention (align with
  `lib/service/stripe.ts`).
- **[H]** Whether referral payable is a *credit to referrer* vs *discount to referee* (affects
  bar-rule exposure; conservative default = referee discount, no cash to non-lawyer referrers).
- **[H]** Flip `ATTORNEY_MARKETPLACE_MONETIZATION_LIVE` in production — **never** an agent action.

## First safe slice

Ship a **pure, flag-off, config-as-code draft engine** with tests — no DB, no UI, no charging:

1. `lib/marketplace/fees/schedule.ts` — types + `DRAFT_FEE_SCHEDULE` (`draft: true`,
   `approved: false`, placeholder rates), with **no** percentage-of-legal-fee representation.
2. `lib/marketplace/fees/compute.ts` — pure `computeFees(...)` + `validateSchedule(...)` that
   rejects `ATTORNEY_MARKETPLACE_POLICY.blockedFeeModels`.
3. `lib/marketplace/fees/__tests__/compute.test.ts` — math fixtures, blocked-model rejection, and
   an assertion that `attorneyMarketplaceMonetizationEnabled()` is false by default.
4. Wire nothing into checkout/payout yet. The flag stays off; the engine is a verified calculator.

This satisfies the acceptance criteria — *"fees compute correctly in test mode from a config; flag
stays off pending review"* — without touching any gated flag, attestation, or payout path, and
keeps all bar/UPL-sensitive activation decisions with counsel.

## Compliance posture for this slice

- Does **not** flip any monetization/compliance flag or attestation.
- Does **not** introduce a blocked fee model — the type system forbids it.
- Migrations (if used) are additive-only with the next free number (0067).
- Counsel sign-off remains a hard gate before activation; this slice is build-ahead only.
