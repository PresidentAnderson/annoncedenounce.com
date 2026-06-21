# Plan — Issue #449: Tax posture + payout runbook approval (pre-activation gate)

> Status: **PLAN ONLY — human/counsel-gated.** This document is the deliverable.
> No flags are flipped, no money moves, no attestations are recorded by this plan.
> Child of epic **#413** (Marketplace monetization — counsel-approved fee/referral
> model + payout operations). Reference implementation lives in `juge.ca`.

## 1. Scope

Issue #449 is the **pre-activation human gate** that must clear *before*
`PROVIDER_PAYOUTS_LIVE=1` is set in production. It is explicitly **not blocking
development** — the agent-buildable payout machinery (reconciliation ledger,
Stripe Connect transfers, EFT-CA rail, refunds/dispute handling, year-end tax
export) is built or in flight under sibling tickets in #413. What remains for
#449 are two artifacts that only humans (counsel / accounting / ops owner) can
sign off:

1. **Tax / information-reporting posture sign-off** — US 1099-K / 1099-NEC and
   Canada T4A obligations, thresholds, withholding/backup-withholding posture,
   and who files.
2. **Payout runbook approval** — the operational procedure for disputes,
   chargebacks, clawbacks, failed/returned payouts, and reversals.

**Acceptance (from the issue):** posture + runbook approved *on file*; only then
flip the payout flag.

### In scope
- Author the tax-posture decision memo template and the payout operations
  runbook (documentation artifacts).
- Map the gate to the existing code so the approval is verifiable and the flag
  cannot flip without the readiness signals being green.
- Define the human approval / attestation procedure.

### Out of scope (handled by other #413 children or explicitly deferred)
- Building reconciliation, transfers, refunds, tax-export *code* (already exists
  in `juge.ca` under `lib/payouts/*`).
- Flipping `PROVIDER_PAYOUTS_LIVE`, `ATTORNEY_MARKETPLACE_MONETIZATION_LIVE`,
  `CA_EFT_COMPLIANCE_APPROVED`, or writing any compliance attestation. **Hard
  rule — agents never flip these.**
- Computing or filing actual tax — the platform produces *reporting* exports
  only; filing is a human/finance responsibility.

## 2. Grounding in existing code (juge.ca reference)

The mechanics this gate guards already exist; the gate is the human layer on top.

- `lib/payouts/index.ts` → `payoutRailReadiness()` already enumerates blockers and
  treats `PROVIDER_PAYOUTS_LIVE` (and, for CA, `CA_EFT_COMPLIANCE_APPROVED`) as
  required-on inputs. The runbook/posture approval is the human precondition for
  ever setting those.
- `lib/payouts/tax-export.ts` → produces **reporting-only** 1099-K / 1099-NEC /
  T4A rows with **configurable, non-authoritative default thresholds** and an
  in-file warning that "Finance/counsel MUST confirm the correct thresholds and
  form mapping for each filing year." #449 is where that confirmation is recorded.
- `lib/payouts/refunds.ts` / `webhook.ts` → already implement refund, dispute
  created/closed (won/lost), and escrow reversal effects. The runbook documents
  *who does what when* these fire, including manual clawback steps.
- `lib/payouts/ledger.ts`, `disburse.ts`, `escrow.ts` → ledger of charges ↔
  payouts ↔ refunds that the reconciliation runbook section references.

## 3. Sub-task checklist

- [ ] [A] Land this plan doc (this PR).
- [ ] [A] Draft `docs/payouts/tax-posture-memo.md` — a template the human owner
      fills in: jurisdictions in scope (US, QC/CA), entity of record, form
      mapping per rail, thresholds per filing year, backup-withholding posture,
      W-9/W-8 / TD1 collection requirement, recipient TIN handling, and the
      data-retention window. Includes a sign-off block (name, role, date).
- [ ] [A] Draft `docs/payouts/payout-runbook.md` — operational procedure:
      dispute intake → freeze payout → evidence submission → win/lose outcomes;
      chargeback handling; clawback of already-disbursed funds (negative-balance
      / next-payout-offset / direct recovery); failed/returned payout retry;
      reconciliation cadence + break-investigation steps; on-call / escalation
      contacts; idempotency + audit-trail expectations.
- [ ] [A] Add a "payout activation checklist" that ties the human sign-offs to
      the machine readiness output (`payoutRailReadiness().blockers` must be
      empty *and* both docs marked approved) — documentation only; it states the
      precondition, it does not perform the flip.
- [ ] [H] **Counsel / accounting:** review and sign the tax-posture memo.
- [ ] [H] **Ops / payments owner:** review and approve the payout runbook.
- [ ] [H] File both approvals (the signed memo + runbook + dated sign-off) so the
      gate is auditable.
- [ ] [H] Only after the above: set `PROVIDER_PAYOUTS_LIVE=1` (and CA gates) in
      production. **Not an agent action.**

## 4. Decisions required (human / architecture / counsel)

| # | Decision | Owner | Why it blocks activation |
|---|----------|-------|--------------------------|
| D1 | Which legal entity is the payer/withholding agent of record per edition (US vs QC/CA)? | Counsel + Finance | Determines which forms apply and who files. |
| D2 | Form mapping per payout rail (Stripe transfer → 1099-K vs 1099-NEC; EFT-CA → T4A) and the authoritative threshold for the current filing year. | Counsel + Finance | Defaults in `tax-export.ts` are explicitly non-authoritative. |
| D3 | Backup-withholding / TIN-collection posture (W-9/W-8 for US, TD1/SIN for CA); do we collect before first payout or before threshold? | Counsel | Affects onboarding flow and whether a payout can be released. |
| D4 | Clawback recovery mechanism precedence (offset future payouts vs. negative balance vs. direct recovery) and the legal basis (provider agreement clause). | Counsel + Ops | Defines the runbook's clawback path and required ToS language. |
| D5 | Dispute/chargeback liability split between platform and provider, and reserve/hold policy. | Counsel + Finance | Drives reserve config and runbook freeze rules. |
| D6 | Reconciliation cadence, break tolerance, and who owns break resolution. | Ops / Finance | Defines the daily reconciliation runbook SLA. |
| D7 | Data-retention window for tax-reporting records and PII (TINs/bank details). | Counsel + Security | Sets retention/erasure policy for the ledger and export. |

## 5. First safe slice

The smallest safe, production-quality step — and the only thing an agent should
ship for #449 right now — is **documentation that makes the gate explicit and
auditable, with no behavioral or flag change**:

1. This plan doc (this PR).
2. Next PR: add the two skeleton documents under `docs/payouts/`
   (`tax-posture-memo.md`, `payout-runbook.md`) with the decision fields from §4
   left as `TODO (human)` blanks and a sign-off section. These are inert
   templates — they change no code path and flip no flag.
3. The human owners fill, review, and sign; the signed versions are committed /
   filed.
4. Activation (flag flip) is performed by a human only after §3 sub-tasks and
   `payoutRailReadiness()` blockers are clear.

This sequence keeps the build moving (per the CTO direction on #413: develop
ahead of counsel, gate only commercial activation) while guaranteeing the
pre-activation gate is recorded and cannot be silently bypassed.

## 6. Guardrails honored

- No edits to `lib/version.ts`.
- No monetization/compliance/payout flag flips and no attestations recorded.
- No migrations (none needed for a plan doc).
- Touches only `docs/plans/issue-449.md`.

Refs #449. Parent #413.
