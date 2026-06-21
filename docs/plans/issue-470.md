# Plan — Issue #470: [meta-epic] Beyond MVP — rich differentiating features

> **Mode:** PLAN (epic / human-gated). This document is the deliverable. It does **not**
> build any feature. It scopes the epic, breaks it into concrete sub-tasks, flags the
> human / architecture / counsel decisions required, and names the first safe slice.

## Repository context (important)

Issue #470 is tracked in the **`PresidentAnderson/juge.ca`** application repository (the
justice-platform product). This repository — `annoncedenounce.com` — is the **static launch
site and operating-workflow home**. Per `docs/OPERATING_CANON.md` it follows the same
operating shape as the stronger sovereign repos, "scaled down for a static launch site," and
cites `juge.ca` as the reference implementation.

Because the platform code (`lib/`, `dictionaries/`, `scripts/check-locales.mjs`, the AI
copilot, escrow, RLS, marketplace, etc.) lives in `juge.ca`, the **implementation work for
#470 happens there**. This plan is committed here as the planning-of-record so the meta-epic
carries a reviewed plan and a PR (Refs #470), consistent with the Sovereign Autonomy rule
that agents "prepare the work; they do not decide the legal posture."

The application-build gates named in the task brief (`tsc --noEmit`, `npm run check:locales`)
do not exist in this static-site repo; the applicable local gate here is `npm run verify`,
which was run for this change. The TypeScript and locale gates **must** be applied in
`juge.ca` when each child issue is implemented.

## Source of truth

- Strategic synthesis: `juge.ca:docs/BEYOND_MVP_ROADMAP.md` (section 2 is this epic).
- Governing book where specs conflict: `GLOBAL_JUSTICE_OPERATING_SYSTEM_ENGINEERING_BOOK.md`.
- Domain tracker / parent: #470. Sibling trackers: #462 (A→Z spine), #481 (mobile).

## Scope

#470 is a **tracker meta-epic**, not a buildable unit. It groups six "rich, differentiating"
feature epics that sit *beyond* the A→Z MVP spine (which is tracked separately by #462). The
shared, non-negotiable guardrail across all six:

> **Legal information, not advice. No fabricated statutes / citations / forms / fees.
> Provenance always. Jurisdiction-honest.** Enforced in code, not just copy. Every epic ends
> with a counsel / native-review gate before it is enabled in any `live` edition.

The six children:

| # | Epic | One-line differentiator | Hard guardrail in code |
|---|------|-------------------------|------------------------|
| #463 | Lifecycle AI Agent Roster (GJOS Vol X) | Single copilot → 5+ provenance-bound agents (triage, deadline-watch, evidence-summarizer, draft-assistant, opposing-argument-analyzer) | Fabricated citation = release blocker; deadline agent advisory-only over the deterministic engine; all doc context untrusted via `lib/ai/prompt-safety.ts` |
| #464 | Real-time multi-party matters & scoped portals | Co-counsel/client/expert + restricted opposing-party portal on one matter | **Document-level scope enforced in RLS, not just the inbox** (this is also security fix #469) |
| #465 | Trust accounting, milestone escrow & e-sign/RON | Single-release escrow → IOLTA-style segregation + milestone releases + e-sign + RON | Money moves only on authenticated human action or pre-authorized milestone; trust funds never commingled; RON respects `lib/ron-rules.ts` whitelist |
| #466 | Outcome analytics & non-advisory insights | Matter timelines + anonymized benchmarking | Descriptive never predictive-as-advice; hard minimum-cohort gate; Analytics Agent read-only on prod |
| #467 | Community & Academy with a UPL guard | Moderated multilingual Q&A + guided self-help + literacy tracks | Active UPL classifier flags directive advice from non-pros and routes to a verified professional; Community Agent never bans alone |
| #468 | Universal accessibility & 200-language reach | WCAG 2.2 AA floor, first-class RTL, disclosed MT | No untranslated Tier-1 key ships (`scripts/check-locales.mjs`); MT always discloses + falls back to source; FR authoritative on QC surfaces (Loi 96) |

**Out of scope for #470:** the A→Z connective-tissue epics (#457–#461), the mobile apps
(#471–#481), and the standalone security fix (#469) except where it is the first child of
#464.

## Sub-task checklist (per child epic)

Each child epic already carries `[A]` (agent-delegatable) and `[H]` (human/counsel) children
in its GitHub issue. This is the rolled-up, sequencing-aware view for #470.

### #463 — AI Agent Roster
- [ ] [A] Agent-contract type (scope, jurisdiction/lang, boundary, confidence, audit hooks) + orchestrator reusing the Anthropic client and `lib/ai/prompt-safety.ts`; persists `{prompt, output, model, confidence, citations[], audit_id}`.
- [ ] [A] Triage agent → boundary-safe next-step **options only**; low confidence routes to a professional.
- [ ] [A] Deadline-watch agent advisory-only; test proves it cannot create/alter a deadline record.
- [ ] [A] Evidence-summarizer from verbatim spans only; uncited claims rejected.
- [ ] [A] Draft-assistant + opposing-argument-analyzer; outputs stamped via `lib/legal/disclaimer.ts`, run through `lib/citations.ts`.
- [ ] [A] Per-agent metering + confidence/provenance UI (extend `Copilot.tsx`).
- [ ] [H] Counsel sign-off + UPL red-team per jurisdiction before any agent goes `live`.

### #464 — Real-time multi-party matters & scoped portals
- [ ] [A] **(security fix #469)** Enforce document-subset scope in RLS: `scope='subset'` share filters child-table SELECT to shared IDs; non-shared doc → 0 rows at the DB layer.
- [ ] [A] Scoped roles (co-counsel edit / client comment+upload / opposing-party scoped-read of served docs) with negative tests per denial.
- [ ] [A] Supabase Realtime presence + live comments (generalize `board.ts`); polling fallback.
- [ ] [A] Conflict-of-interest check before co-counsel/expert grant (suggest-only + human confirm).
- [ ] [A] Opposing-party portal: read-only view of formally-served documents only; own disclaimer; no copilot.
- [ ] [A] Optimistic local edit + audited server reconciliation (never silent loss).
- [ ] [H] Counsel review of opposing-party disclosure + service-of-process implications per jurisdiction.

### #465 — Trust accounting, milestone escrow & e-sign/RON
- [ ] [A] Milestone object on engagements (deliverable-tied, own escrow sub-balance, authenticated release).
- [ ] [A] Double-entry trust-segregation ledger + daily reconciliation; proves client funds never counted as revenue.
- [ ] [A] In-platform e-signature: signer identity via Stripe Identity, tamper-evident hash + immutable audit.
- [ ] [A] RON booking tied to commissioner marketplace; online oath only where `lib/ron-rules.ts` allows.
- [ ] [A] Transparent fee/escrow/tax breakdown in checkout from the configurable engine (#443).
- [ ] [H] Counsel + tax sign-off on trust posture per jurisdiction (IOLTA differs) + payout runbook.
- [ ] [H] Legal review that e-sign/RON meets each jurisdiction's execution/notarization formalities.

### #466 — Outcome analytics & non-advisory insights
- [ ] [A] Matter timeline view (milestones + evidence + deadline events), exportable, surfacing date conflicts.
- [ ] [A] Anonymized benchmarking with a hard minimum-cohort gate (below threshold → "not enough data").
- [ ] [A] Confidence + provenance envelope on every insight (sample size, jurisdiction, recency, model).
- [ ] [A] Read-only enforcement (DB role/RLS) on the analytics path; write attempt denied in test.
- [ ] [A] Jurisdiction-honesty guard: aggregate only within a `live` cohort.
- [ ] [H] Counsel + privacy review of methodology + cohort threshold + disclosure before any insight ships.

### #467 — Community & Academy with a UPL guard
- [ ] [A] Moderated Q&A model + surface (threads, translation metadata, verified-pro badges); non-pro directive answer → UPL flag + route.
- [ ] [A] UPL-guard classifier (suggest-only) → human moderation queue (no auto-takedown).
- [ ] [A] Guided self-help decision-tree flows per `live` jurisdiction (information + options, not advice).
- [ ] [A] Academy course/lesson/quiz model + completion; legal content gated `needs_review → approved → published`.
- [ ] [A] Knowledge-capture loop: clustered community questions → Help-Center / Academy draft tasks.
- [ ] [H] Indigenous-language partnership track (#388): partnership-governed translation.
- [ ] [H] Counsel + native review of all jurisdiction explainers + Academy legal content before publish.

### #468 — Universal accessibility & 200-language reach
- [ ] [A] `TranslatedField` model (`sourceLocale, sourceText, translations[]{locale, text, model, confidence, reviewState}`).
- [ ] [A] MT-with-disclosure rendering ("machine-translated, verify against source" badge + one-click source).
- [ ] [A] First-class RTL (dir-aware, logical CSS) for ar/he, gated in CI.
- [ ] [A] WCAG 2.2 AA pass on workspace + marketplace + copilot.
- [ ] [A] Extend `scripts/check-locales.mjs` to block missing Tier-1 keys + assert FR coverage on QC legal surfaces in CI.
- [ ] [H] Indigenous-language partnership onboarding (#388): consent + authority agreements.
- [ ] [H] Native-speaker legal review per Tier-1 locale before marked authoritative.

## Human / architecture / counsel decisions required

These are **gates**, not tasks — none of the `[A]` work for a child epic may be enabled in a
`live` edition until the corresponding decision is recorded.

1. **UPL / unauthorized-practice red-team (counsel, per jurisdiction).** Required before any
   #463 agent or #467 community surface is enabled live. The boundary is the product;
   sign-off is per launched edition (QC / US), not global.
2. **Trust-accounting & tax posture (counsel + tax).** IOLTA rules differ by jurisdiction;
   #465 cannot move client money in a `live` edition without a recorded posture decision and
   a payout runbook. **Per the HARD RULES, no monetization / compliance gate flag or
   attestation may be flipped by an agent** — these stay human-owned.
3. **Notarization formalities (counsel).** Which states/provinces accept RON, and the exact
   identity-proofing standard, is a legal determination feeding `lib/ron-rules.ts`. Agents
   implement the whitelist; counsel sets its contents.
4. **Opposing-party disclosure & service-of-process (counsel + architecture).** #464's
   opposing-party portal touches disclosure obligations and the service clock; the data model
   and the disclaimer both need legal review per jurisdiction.
5. **Analytics methodology & cohort threshold (counsel + privacy).** The minimum-cohort gate
   for #466 is a Law 25 / PIPEDA / GDPR determination, not an engineering default.
6. **Indigenous-language authority (partnership governance, #388).** #467/#468 translation of
   Indigenous-language legal content is partnership-governed, not raw machine translation;
   requires consent + authority agreements before anything is marked authoritative.
7. **Architecture: RLS as the enforcement layer.** #464/#466 both assert "enforced at the DB
   layer." This is an architecture decision (Supabase RLS / DB roles) that must be settled
   before the first child lands, because #469 is a *latent security bug today*.

## First safe slice

**Land #469 inside #464: enforce `matter_shares` document-subset scope in RLS.**

Why this first:
- It is the **highest-leverage, lowest-ambiguity** slice — a self-contained security fix, not
  a new product surface, so it needs no new counsel sign-off to *fix the leak* (the leak
  violates the existing ownership≠access wall #154).
- The roadmap explicitly sequences #469 first ("unblock everything; close the DB leak") and
  names it the first child of #464 and "a latent bug today."
- It establishes the **RLS-is-the-enforcement-layer** pattern that #464 and #466 both depend
  on, de-risking the rest of the epic.

Concrete shape of the first slice (executed in `juge.ca`, not here):
1. Add an additive, next-free-numbered migration that adds an RLS policy on the document
   child tables so a `scope='subset'` share in `matter_shares` filters `SELECT` to the shared
   document IDs — a non-shared document returns **0 rows at the DB layer**, independent of any
   UI filtering.
2. Add **negative tests**: a `review`/`subset` recipient querying a non-shared document gets
   zero rows; an owner still sees everything; a full-scope share is unaffected.
3. Run the application gates in `juge.ca`: `tsc --noEmit` (no new errors in touched files) and
   `npm run check:locales` if any user-facing string changes.
4. Open the fix as its own PR referencing **#469** and **#464**, link it under #470.

Everything else in #470 stays behind its counsel/native-review gate and is fanned out into
standalone child issues on demand (the pattern already used for #411–#456).

## Definition of done for this planning issue

- [x] Scope of the meta-epic captured (the six children + shared guardrail).
- [x] Concrete sub-task checklist per child epic, rolled up from each issue.
- [x] Human / architecture / counsel decision gates enumerated.
- [x] First safe slice named, justified, and sequenced (#469 within #464).
- [ ] (Follow-up, in `juge.ca`) implement the first slice as its own PR (Refs #469, #464).
