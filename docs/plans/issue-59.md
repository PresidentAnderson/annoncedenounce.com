# Plan — Issue #59: [config] Enable provider payouts

> **Mode: PLAN (config, human-gated).** This document is the deliverable. It does
> **not** flip any flag or set any secret. It scopes the enablement, lists a
> concrete sub-task checklist, names the human / ops / counsel decisions that must
> land first, and defines the first safe slice an agent can ship.

- **Issue:** [config] Enable provider payouts
- **Labels:** `config`, `area:payments`
- **Related:** go-live ops **#422** · monetization epic **#413** · pre-activation
  tax/runbook gate **#449** · payout execution + transfer webhook **#446**
- **Code lives in:** `PresidentAnderson/juge.ca`. This PR lands the plan doc in
  the `annoncedenounce.com` repo, where this worktree is checked out; the
  implementation/config work itself happens in `juge.ca`.

## Why this is a plan PR (two independent blockers)

1. **Repo mismatch.** Issue #59 and every artifact it names
   (`lib/trust/release-readiness.ts` → `providerPayouts`, `lib/payouts/*`, the
   `feat/payout-escrow` branch) live in **`PresidentAnderson/juge.ca`**. This
   worktree is the static `annoncedenounce.com` launch site and contains no
   payments code. Editing another repository from this worktree is forbidden by
   the task's hard rules.
2. **Hard-rule gate.** The issue's entire ask is to set `PROVIDER_PAYOUTS_LIVE=1`
   and provision live payout rails (Stripe Connect keys, `EFT_PROVIDER_API_KEY` /
   `EFT_BATCH_EXPORT_ENABLED`). Per the hard rules an agent must **never flip
   monetization / compliance gate flags or attestations**, and these are
   env-driven and human-gated by design (see `release-readiness.ts`). The related
   issues (#422, #449) carry the `human-gate` label for exactly this reason.

Per the fallback ("if blocked on a real build, STILL open a PR carrying a plan
doc so the issue has a PR"), this PR ships the plan. Refs #59.

## Acceptance (from the issue)

The status panel — driven by `lib/trust/release-readiness.ts`
(`providerPayouts`) — flips from **"not set up"** to **set up / live** once
`PROVIDER_PAYOUTS_LIVE=1` and the payout rails are provisioned: US/CA Stripe
Connect keys and/or `EFT_PROVIDER_API_KEY` / `EFT_BATCH_EXPORT_ENABLED`.

## Hard rules carried into every sub-task

- **Never** edit `lib/version.ts`.
- **Never** flip monetization / compliance gate flags or attestations from code
  (`PROVIDER_PAYOUTS_LIVE`, `CA_EFT_COMPLIANCE_APPROVED`, attorney/tax
  attestations). These are env-driven and human-gated by design.
- Migrations are **additive-only** with the next free number (coordinate with
  the payouts go-live plan, which reserves `0068_*`).
- Touch only files relevant to payout enablement.

---

## What this config flag actually controls

`PROVIDER_PAYOUTS_LIVE` is a **release-readiness gate**, not a feature toggle the
agent can set. When OFF (the current state), `release-readiness.ts` reports
`providerPayouts` as not set up and the marketplace engage/disburse paths stay
gated. Flipping it to `1` is the *last* step of go-live, and it is only safe once
every rail below is provisioned and verified. Setting it without the rails would
report "live" while payouts silently fail — the failure mode the gate exists to
prevent.

### Rails the flag depends on (per edition)

| Edition | Rail | Env it needs |
| --- | --- | --- |
| US | Stripe Connect (Express) | `STRIPE_SECRET_KEY`, `STRIPE_CONNECT_CLIENT_ID`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `STRIPE_PAYOUTS_WEBHOOK_SECRET` |
| CA / QC | EFT batch / provider | `EFT_PROVIDER_API_KEY` **or** `EFT_BATCH_EXPORT_ENABLED`, `ENCRYPTION_KEY` (bank-detail encryption), `CA_EFT_COMPLIANCE_APPROVED` (human attestation) |

---

## Scope

**In scope (agent-buildable, with the flag still OFF):**
- Verify `release-readiness.ts` `providerPayouts` reports a **complete, accurate
  blocker list** — i.e. names every missing env/rail so an operator knows exactly
  what to set before flipping the flag. Add any missing blocker reporting (this is
  diagnostic only and does not change gate state).
- Add/confirm a test that asserts the readiness gate stays OFF unless **all**
  required env per edition is present (prevents "live but unconfigured").
- Document the exact env matrix above in the juge.ca payout runbook so the flip
  is a checklist, not a guess.

**Out of scope (human / ops / counsel only — do NOT attempt in code):**
- Setting `PROVIDER_PAYOUTS_LIVE=1` in any environment.
- Provisioning live secrets (`STRIPE_*`, `EFT_PROVIDER_API_KEY`,
  `ENCRYPTION_KEY`) in the deploy environment.
- The `CA_EFT_COMPLIANCE_APPROVED` attestation (#449).
- Stripe Connect dashboard configuration and webhook-endpoint registration
  (covered by #422).
- Tax / 1099 posture and runbook approval (#449, #413).

---

## Sub-task checklist

> Tags: **[A]** = agent-buildable (flag stays OFF) · **[H]** = human / ops /
> counsel gate.

- [ ] **[A]** Audit `lib/trust/release-readiness.ts` `providerPayouts` and
      `lib/payouts/index.ts` `payoutRailReadiness()`: confirm every required env
      per edition is checked and surfaced as a named blocker when missing.
- [ ] **[A]** Add a unit test: gate is OFF unless all per-edition rails are
      present; gate reports the precise missing-env list.
- [ ] **[A]** Document the env matrix (above) in the juge.ca payout go-live
      runbook.
- [ ] **[H]** Provision US Stripe Connect secrets in the deploy env (#422).
- [ ] **[H]** Provision CA/QC EFT rail (`EFT_PROVIDER_API_KEY` /
      `EFT_BATCH_EXPORT_ENABLED`, `ENCRYPTION_KEY`).
- [ ] **[H]** Counsel attestation `CA_EFT_COMPLIANCE_APPROVED` (#449).
- [ ] **[H]** Tax / 1099 posture + runbook approval (#449, #413).
- [ ] **[H]** Flip `PROVIDER_PAYOUTS_LIVE=1` — last step, after a test-mode
      end-to-end payout verifies (#422 / #446).

---

## Human / architecture / counsel decisions required (blockers)

1. **Who owns the flip and the rollback (ops).** Order of operations, the
   test-mode verification that must pass first, and the rollback to OFF if
   `payout.failed` events spike. Tracked in #422's runbook.
2. **Live secret provisioning (ops/security).** Source and rotation of the
   Stripe and EFT secrets; confirm they are deploy-env only, never committed.
3. **CA EFT compliance attestation (counsel, #449).** `CA_EFT_COMPLIANCE_APPROVED`
   is a human attestation and must never be code-set; confirm encryption-at-rest
   and the chosen CA rail.
4. **Tax / 1099 posture (counsel + finance, #449/#413).** Must clear before the
   flag flips.
5. **Per-edition rail confirmation (architecture).** Confirm US = Stripe Connect
   and CA/QC = EFT, matching the issue title and current `getPayoutProvider()`
   behavior, so the readiness checks gate the correct env per edition.

---

## First safe slice (agent, mergeable with the flag OFF)

The smallest correct, production-quality change that advances enablement without
touching any gate state:

**Tighten and test the `providerPayouts` readiness reporting so flipping the flag
becomes a verifiable checklist instead of a guess.**

1. In `lib/trust/release-readiness.ts` (and `lib/payouts/index.ts`
   `payoutRailReadiness()`), ensure `providerPayouts` returns the **full list of
   missing rails/env per active edition** as named blockers — purely diagnostic,
   no change to whether the gate is on or off.
2. Add a unit test under `lib/payouts/__tests__/` (or the readiness test home)
   asserting: with no env, the gate is OFF and the blocker list names each
   missing variable; with all required env present (test fixtures, not live
   keys), the gate's env precondition is satisfied. Honor `isTestMode()`; use no
   live secrets.
3. **Do not** flip any flag, set any secret, edit `lib/version.ts`, or change the
   gate's on/off decision logic — only the completeness/clarity of its reporting.

**Why this slice first:** it directly serves the issue (the status panel that
shows "not set up" is the `providerPayouts` readiness output), it is fully
testable with the flag OFF, it carries zero go-live risk, and it converts the
remaining **[H]** gates into an explicit, operator-readable checklist — which is
exactly what a `config` enablement issue needs before a human can safely flip the
flag.

### Definition of done for the first slice
- `tsc --noEmit` adds no new errors in touched files.
- New unit test(s) pass.
- No gate flag, secret, attestation, or `lib/version.ts` change.
- No change to the gate's on/off decision — reporting only.
- PR references #59 and notes the remaining **[H]** gates as unblocked-but-not-
  performed.
