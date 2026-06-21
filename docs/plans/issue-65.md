# Plan — Issue #65 — [epic] Phase 3 — GA (Jan 2027) — billing live

Status: PLAN (epic / human-gated). This document is the deliverable. No code, no
gate flags, no attestations are changed by this PR.

## TL;DR

Issue #65 is a **GA / monetization epic**: turn billing on for real users at
General Availability (target Jan 2027). Going "billing live" means flipping
**monetization and payout gates from off to on** and provisioning live payment
credentials. Those are exactly the compliance/safety gates an autonomous agent
is forbidden to flip, and the work surface does not live in this repository.
This PR carries the plan so the issue has a PR and so the work can be sequenced
and routed correctly.

## Repository mismatch (read this first)

The epic targets the **juge.ca application** (Next.js app with a `lib/` billing
and trust surface). **This** repository — `annoncedenounce.com` — is the static
marketing/launch site: `index.html`, `privacy.html`, `robots.txt`,
`sitemap.xml`, `vercel.json`, a `/api/version` probe, and the version-governance
scripts. It has **no billing code, no checkout, no Stripe integration, no
payouts, and no `lib/` directory**. Nothing here can be made "billing live."

Concrete evidence in juge.ca (reference paths, not edited by this PR):

- `lib/trust/release-readiness.ts` — the monetization/payout gate. It reads
  env-driven flags such as `ATTORNEY_MARKETPLACE_MONETIZATION_LIVE`,
  `PROVIDER_PAYOUTS_LIVE`, `STRIPE_SECRET_KEY`, `STRIPE_CONNECT_WEBHOOK_SECRET`,
  and `ENCRYPTION_KEY`, and only reports `attorneyMarketplaceMonetization` /
  `providerPayouts` as ready when both the ethics/approval condition and the
  live credentials are present.
- `lib/__tests__/ops-checkout-gating.test.ts` — asserts the **default ship
  state is BLOCKED**: lawyer/expert checkout is denied until monetization flags
  are explicitly turned on. GA flips that default.
- `lib/copilot/billing.ts`, `lib/__tests__/payouts.test.ts`,
  `lib/payouts/eft-ca.ts` — the billing/payout implementation surface.

Because the implementation surface is absent here, the correct action is to
**route execution to `PresidentAnderson/juge.ca`** (or re-point the autonomy
worktree there). This matches the precedent set for sibling cross-repo epics
(e.g. the plan PRs for #56, #411, #421).

## Scope

In scope for the GA "billing live" epic (executed in juge.ca):

- Provision **live** payment credentials (Stripe live secret key, Connect
  webhook secret, encryption key) in the production secret store.
- Flip the monetization/payout **release-readiness gates** from off to on,
  with the ethics/approval conditions satisfied first.
- Verify checkout, subscription/charge, refund, and Connect payout flows
  end-to-end against live (or live-test) infrastructure.
- Tax, invoicing, receipts, and dunning/failed-payment handling are correct
  for the target jurisdictions (Quebec / Canada first, then expansion).
- Webhook reliability: idempotency, signature verification, retry/replay,
  reconciliation against Stripe.
- Customer-facing billing surfaces: pricing, checkout, billing portal,
  invoices, and the legal/terms surface that must reference paid plans.
- Observability and incident runbook for payment failures and disputes.

Out of scope (explicitly):

- Any change in **this** static repo beyond this plan doc.
- Editing `lib/version.ts`, flipping any monetization/compliance gate flag, or
  modifying attestations — forbidden for the autonomous agent regardless of
  repo.
- New pricing/packaging decisions (product + finance own these).

## Sub-task checklist (to execute in juge.ca)

- [ ] Confirm Stripe **live** account is fully onboarded (business profile,
      bank account, tax settings, Connect enabled for provider payouts).
- [ ] Land live secrets in the prod secret store: `STRIPE_SECRET_KEY`,
      `STRIPE_CONNECT_WEBHOOK_SECRET`, `ENCRYPTION_KEY` (rotate-safe), and any
      publishable key the client needs. Never commit secrets.
- [ ] Configure the live Stripe webhook endpoint and register the events the
      app consumes; verify signature handling and idempotency keys.
- [ ] Build/confirm a **live-credentials-present-but-gate-still-off** preview
      so flows are exercised before the default flips (the safe first slice).
- [ ] Run the full billing test suite (`ops-checkout-gating.test.ts`,
      `payouts.test.ts`, and any subscription/refund tests) against the
      live-test configuration.
- [ ] Validate tax/invoice/receipt output for QC/CA; confirm GST/QST handling.
- [ ] Validate refund and Connect payout (EFT-CA) paths end-to-end.
- [ ] Reconciliation + observability: dashboards, alerts, and a payments
      incident runbook (disputes, chargebacks, failed payouts).
- [ ] Update legal/ToS/privacy surfaces to reflect paid plans and billing data
      handling (Loi 25 / RGPD) — counsel sign-off required.
- [ ] **Human-gated flip:** turn the monetization/payout release-readiness
      gates on in production, with named owner + dated approval recorded.
- [ ] Post-GA monitoring window with rollback (re-gate) plan ready.

## Decisions required before any flip

Human / architecture:

- [ ] Final pricing, packaging, and trial/grace policy (product + finance).
- [ ] GA date confirmation and the go/no-go owner for the gate flip.
- [ ] Rollback strategy: how fast can monetization be re-gated if a payment
      incident occurs, and who can authorize it.
- [ ] Secret ownership and rotation policy for live Stripe credentials.

Legal / counsel:

- [ ] Tax registration and remittance obligations confirmed for launch
      jurisdictions (QC/CA first).
- [ ] Terms of Service, refund policy, and billing-data privacy disclosures
      reviewed and approved.
- [ ] Attorney-marketplace monetization ethics conditions confirmed (the gate
      keys this off `attorneyEthicsApproved`).
- [ ] PCI scope confirmed (Stripe-hosted checkout keeps scope minimal — verify
      no raw card data touches the app).

## First safe slice (no gate flip, no autonomous flag change)

The smallest correct first step is **preview-only validation with the gate
left OFF**:

1. In juge.ca, stand up a non-production / preview environment with live-test
   Stripe credentials wired in but the monetization/payout release-readiness
   gates **still off** (default-blocked ship state preserved).
2. Exercise checkout, subscription, refund, and Connect payout flows there and
   capture evidence (logs, Stripe dashboard objects, reconciliation).
3. Produce a go-live checklist artifact and route the **production gate flip**
   to the named human owner for the dated, approved GA cutover.

This proves the path works without an autonomous agent ever flipping a
monetization/compliance gate.

## Guardrails honored by this plan

- This PR touches **only** `docs/plans/issue-65.md` (Markdown). No source,
  config, migration, version, or attestation files are changed.
- No monetization/compliance gate flag is flipped here.
- `lib/version.ts` is not touched (and does not exist in this repo).
- The local site verifier (`npm run verify`) is unaffected by a new doc; a
  Markdown-only change introduces no type or build errors.

## Required human action

Route the actual GA billing implementation to `PresidentAnderson/juge.ca` (or
re-point the autonomy worktree there), then execute the checklist above,
finishing with the human-gated production gate flip.
