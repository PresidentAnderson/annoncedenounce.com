# Plan — Issue #465 (epic): Trust accounting, milestone escrow & e-sign/RON

> **Mode:** PLAN (epic / human-gated). This document is the deliverable. Do **not**
> build the feature from this PR. No money-movement, compliance-gate, or attestation
> code is shipped here.

## 0. Repository note (read first)

Issue #465 is tracked in the GitHub repo `PresidentAnderson/juge.ca`, but the
runtime/payments/compliance code it touches lives in the **`juge.ca`** working
copy, not in this `annoncedenounce.com` static-site repo. All file paths below are
**relative to the `juge.ca` repo root** unless stated otherwise. This plan file is
committed in the `annoncedenounce.com` repo so the issue has a tracking PR; the
actual sub-task PRs must be opened against `juge.ca`.

Anchors verified in `juge.ca` at planning time:
- `lib/payouts/escrow.ts` — single-release escrow state machine (states:
  `pending → funds_held → releasable → released`, plus `refunded`/`reversed`/`disputed`).
- `lib/payouts/ledger.ts` — `accruePayout`, `platformFeeCents`, `netPayoutCents`;
  writes to the `payouts` table.
- `lib/payouts/{disburse,refunds,stripe-connect,eft-ca,tax-export,webhook,types}.ts`.
- `lib/ron-rules.ts` — `ronAllowed()` (QC online; US whitelist **FL/TX/VA/WA**;
  everything else in-person only) + localized availability copy.
- `lib/marketplace/engage.ts` — engagement/relay surface to wire milestones onto.
- Migrations live in `supabase/migrations/`; **highest is `0066_site_presence.sql`,
  so the next free number is `0067`** and migrations are **additive-only**.

## 1. Scope

Extend today's **single-release** escrow into:
1. **Milestone escrow** — deliverable-tied milestones, each with its own escrow
   sub-balance and its own authenticated release, wired into the #383 pipeline.
2. **Trust-segregation ledger (double-entry)** — proves client funds are never
   counted as revenue (IOLTA-style), with daily reconciliation (#445).
3. **In-platform e-signature** — signer identity via Stripe Identity, a signature
   event with a tamper-evident hash and an immutable audit trail.
4. **RON booking** — tied to the commissioner marketplace; online oath only where
   `lib/ron-rules.ts` allows; non-whitelisted US state is refused.
5. **Transparent checkout breakdown** — fee/escrow/tax lines (#444) driven by the
   configurable, counsel-approved fee engine (#443).

### Out of scope / dependencies (do not duplicate)
- The configurable fee model itself = **#443** (consume it; do not re-implement).
- Checkout breakdown UI = **#444** (this epic supplies the trust/escrow line data).
- Daily reconciliation engine = **#445** (this epic emits the ledger it reconciles).
- Payout runbook = **#449**. Builds on #413/#383/#383-pipeline and #443–#449.

### Guardrails (hard, non-negotiable — carry into every sub-PR)
- Money never moves without an **authenticated human action** or a
  **pre-authorized milestone** release.
- Trust funds are **segregated** — never commingled with platform revenue; the
  ledger must make commingling representationally impossible (separate accounts).
- RON honors `lib/ron-rules.ts` (QC online; US FL/TX/VA/WA only) — never widen the
  whitelist in code; non-whitelisted jurisdictions fall back to in-person.
- E-sign captures **intent + identity** (Stripe Identity) plus a **tamper-evident**
  audit record.
- Fees come only from the **#443** configurable, counsel-approved engine.
- Core access flows are **not** paywalled.
- Migrations are **additive-only**, next free number `0067`, sequential thereafter.
- Never edit `lib/version.ts`; never flip monetization/compliance gate flags or
  attestations.

## 2. Sub-task checklist

Each `[A]` item below should become its own focused PR against `juge.ca`, gated by
the `[H]` human/counsel decisions in §3. Suggested ordering reflects dependencies.

### A. Schema foundation (additive migrations)
- [ ] `0067_trust_ledger.sql` — double-entry trust ledger: `trust_accounts`
      (one segregated account per client/matter), `trust_ledger_entries`
      (immutable, debit/credit, references account + payout/milestone), with a DB
      constraint that every transaction nets to zero and a CHECK that trust
      entries cannot post to a revenue account. Append-only (no UPDATE/DELETE via
      RLS/trigger), mirroring the existing audit-chain pattern
      (`supabase/migrations/0062_audit_chain_serialize.sql`).
- [ ] `0068_milestones.sql` — `engagement_milestones` (engagement_id, title,
      deliverable description, amount_cents, currency, sequence, status:
      `pending|funded|releasable|released|refunded`, escrow sub-balance link,
      authorized_release_by, authorized_at). Additive FK onto the existing
      engagement/order tables; no change to `payouts` columns beyond additive ones.
- [ ] `0069_esign_ron.sql` — `signature_requests`, `signature_events`
      (signer_id, stripe_identity_session, intent_text, content_hash,
      prev_hash for tamper-evident chaining, signed_at, ip/ua), and
      `ron_sessions` (commissioner_id, jurisdiction, ron_allowed snapshot,
      scheduled_at, recording/oath metadata). Append-only audit semantics.

### B. Milestone escrow (lib/payouts)
- [ ] Extend the escrow model to a **per-milestone sub-balance** without breaking
      the single-release path: introduce `lib/payouts/milestones.ts` that composes
      the existing `applyTransition`/`canRelease` from `escrow.ts` per milestone
      rather than forking the state machine.
- [ ] Add a `milestone_release` event requiring `authenticatedActor` +
      (`orderComplete` for that milestone || `preAuthorizedMilestone`) — reuse the
      existing `ReleaseContext` reasons vocabulary.
- [ ] Wire into the #383 pipeline (engagement → deliverable accepted → milestone
      releasable) and `lib/marketplace/engage.ts`.
- [ ] Tests under `lib/payouts/__tests__/` covering: partial release, no release
      without auth, refund of an unfunded milestone, idempotency.

### C. Trust-segregation ledger (double-entry)
- [ ] `lib/payouts/trust-ledger.ts` — post paired debit/credit entries; expose a
      pure `assertSegregation()` that fails if a trust account ever maps to a
      revenue account. Build on `ledger.ts` helpers but keep trust postings in
      their own table/account space.
- [ ] Daily reconciliation **hook** that #445 consumes (sum of trust balances ==
      sum of held escrow sub-balances). Emit, do not own, the cron.
- [ ] Property tests: random transaction streams always net to zero; revenue
      recognition never reads trust balances.

### D. E-signature
- [ ] `lib/esign/` — `createSignatureRequest`, `recordSignatureEvent`. Identity via
      Stripe Identity session (reuse existing Stripe wiring in
      `lib/payouts/stripe-connect.ts` for the client/secret plumbing pattern).
- [ ] Tamper-evident hash: `content_hash = sha256(intent || doc || signer ||
      prev_hash)`, chained per request (mirror `0062_audit_chain_serialize.sql`).
- [ ] Immutable audit: append-only table + RLS; surface a verifier that recomputes
      the chain.

### E. RON booking
- [ ] `lib/ron/booking.ts` — gate every booking through `ronAllowed()` from
      `lib/ron-rules.ts`; **refuse** (do not silently downgrade) when the
      jurisdiction is not whitelisted, returning the in-person fallback path.
- [ ] Tie to the commissioner marketplace (`lib/marketplace/*`). Capture oath
      metadata into `ron_sessions`.
- [ ] Tests: QC allowed; FL/TX/VA/WA allowed; every other US state refused;
      unknown/empty jurisdiction refused.

### F. Checkout breakdown (data only)
- [ ] Provide a `trustBreakdown()` that returns escrow-hold, trust-segregated, and
      tax line items sourced **only** from the #443 fee engine, for #444 to render.
- [ ] No paywalling of core access flows; assert that gate flags are untouched.

### G. i18n
- [ ] Any new user-facing strings (milestone states, e-sign intent copy, RON
      availability) added to all locale files; run `npm run check:locales`.
      Reuse the existing `ronRuleLabel()` locale map pattern from `lib/ron-rules.ts`.

## 3. Human / architecture / counsel decisions required (blocking)

These `[H]` items must be resolved **before** the corresponding `[A]` code merges:

1. **Trust posture per jurisdiction (IOLTA differs).** Counsel + tax sign-off on:
   which jurisdictions permit pooled vs. per-client trust accounts, interest
   handling (IOLTA remittance), and whether QC (notaries/avocats trust rules)
   differs from the US states. Drives the `trust_accounts` model granularity.
2. **E-sign / RON legal sufficiency.** Legal review that the e-signature flow
   (intent + Stripe Identity + tamper-evident audit) and RON meet **each**
   jurisdiction's execution/notarization formalities. Confirms whether Stripe
   Identity alone satisfies signer-identity requirements or a second factor /
   credential analysis is required.
3. **Fee model approval (#443).** Confirm the counsel-approved fee engine is final
   and exposes the line items checkout (#444) needs, before this epic consumes it.
4. **Payout runbook (#449).** Operational sign-off on milestone release authority
   (who may pre-authorize, dual-control thresholds) and reconciliation breach
   response.
5. **Architecture:** confirm append-only ledger + tamper-evident hash chain reuse
   the existing audit substrate (`lib/security/audit-substrate.ts`,
   `0062_audit_chain_serialize.sql`) rather than introducing a parallel mechanism.

## 4. First safe slice (no money movement, no gate changes)

Ship **only** the schema + pure-logic foundation behind tests — nothing that moves
funds, books a notary, or signs anything:

1. **Migration `0067_trust_ledger.sql`** — additive, next free number, append-only
   double-entry tables with the net-to-zero and no-commingling constraints. No
   reads from production payout paths yet.
2. **`lib/payouts/trust-ledger.ts`** — pure functions: build paired entries,
   `assertSegregation()`, `entriesNetToZero()`. No Supabase writes wired into live
   flows; fully unit-tested in `lib/payouts/__tests__/trust-ledger.test.ts`.

This slice is safe because it is purely additive (new table + new module + tests),
introduces no money-movement code path, touches no gate flags or attestations,
does not edit `lib/version.ts`, and is independently reviewable. It must pass
`node_modules/.bin/tsc --noEmit` and `npm run check:locales` (the latter trivially,
as the slice adds no user-facing strings).

## 5. Verification gate for every sub-PR

- `node_modules/.bin/tsc --noEmit` adds no new type errors in touched files.
- `npm run check:locales` passes if any user-facing string changed.
- New money-movement paths have tests proving they refuse without an authenticated
  actor / pre-authorized milestone.
- No edits to `lib/version.ts`; no monetization/compliance gate flag or attestation
  changes; migrations additive-only and sequentially numbered from `0067`.
