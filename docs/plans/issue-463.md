# Plan — Issue #463: [epic] Lifecycle AI Agent Roster (GJOS Vol X) — orchestrated, provenance-bound

> **Mode:** PLAN (epic / human-gated). This document is the deliverable. It does **not**
> build any agent. It scopes the epic, breaks it into concrete sub-tasks, names the
> human / architecture / counsel decisions required, and identifies the first safe slice.

## Repository context (important)

Issue #463 is tracked against the **`PresidentAnderson/juge.ca`** application repository (the
justice-platform product). This repository — `annoncedenounce.com` — is the **static launch
site and operating-workflow home**. Per `docs/OPERATING_CANON.md` it follows the same
operating shape as the stronger sovereign repos, "scaled down for a static launch site," and
names `juge.ca` as the reference implementation.

Because the platform code referenced by this epic (`app/api/ai/copilot`, `lib/ai/prompt-safety.ts`,
`lib/citations.ts`, `lib/legal/disclaimer.ts`, `lib/evidence-extraction.ts`, the Anthropic
client, `Copilot.tsx`) lives in `juge.ca`, the **implementation work for #463 happens there**.
This plan is committed here as the planning-of-record so the epic carries a reviewed plan and a
PR (Refs #463), consistent with the Sovereign Autonomy rule that agents "prepare the work; they
do not decide the legal posture," and matching the sibling planning PRs (#465–#468, #470, etc.).

The application-build gates named in the task brief (`tsc --noEmit`, `npm run check:locales`)
do not exist in this static-site repo; the applicable local gate here is `npm run verify`,
which was run for this change. Those gates **must** be applied in `juge.ca` when each child
issue is implemented.

This epic is child #463 of meta-epic **#470** ("Beyond MVP — rich differentiating features"),
where it is the AI-roster row of the differentiator table.

## Why it differentiates

Turns the single ask-box copilot (`/api/ai/copilot`) into a **lifecycle roster of specialized,
boundary-safe agents** — triage, deadline-watch, evidence-summarizer, draft-assistant,
opposing-argument-analyzer — where **every output carries machine-checkable provenance**
(prompt, model, confidence, cited spans, audit id). The differentiator is not "more AI"; it is
**auditable-end-to-end AI**: every claim is traceable to a verbatim source span and a recorded
run, and no agent can act outside its declared boundary.

## Non-negotiable guardrails (enforced in code, not copy)

These are inherited from the GJOS book and the #470 shared guardrail and apply to **every**
agent in the roster:

1. **Information, not advice.** An information-not-advice system prompt is applied to *every*
   agent; outputs are stamped via `lib/legal/disclaimer.ts`.
2. **No fabricated citations.** Any citation an agent emits must resolve through
   `lib/citations.ts`; an unresolved or invented statute / case / form / fee is a
   **release-blocking defect**, not a warning.
3. **Deadline agent is advisory only.** The deterministic deadline engine stays the single
   source of truth; the deadline-watch agent may surface and explain, never create or alter a
   deadline record. A test must prove it *cannot* write.
4. **All document context is untrusted.** Every doc/evidence span fed to a model passes through
   `lib/ai/prompt-safety.ts` (prompt-injection / data-exfiltration defense) before it reaches a
   prompt.
5. **Confidence-gated human routing.** Low / medium confidence flags route to a human /
   verified professional ("unknown → route to professional"); agents never resolve on low
   confidence.
6. **Every action is audited.** Each agent run emits an audit event and persists
   `{prompt, output, model, confidence, citations[], audit_id}`.

## Scope

In scope (the roster + the contract + the provenance surface):
- A shared **agent contract** + **orchestrator** that all agents are built on.
- Five lifecycle agents: **triage**, **deadline-watch (advisory)**, **evidence-summarizer**,
  **draft-assistant**, **opposing-argument-analyzer**.
- **Per-agent metering** and a **confidence / provenance UI** extending `Copilot.tsx`.
- A **counsel + UPL red-team gate** per jurisdiction before any agent is enabled in a `live`
  edition.

Out of scope for #463:
- Sibling #470 epics (multi-party portals #464, escrow #465, analytics #466, community #467,
  accessibility #468). #463 *operates on* the #100 dispute/matter model but does not change it.
- Any change to the deterministic deadline engine itself (#463 reads it; it does not own it).
- Provider procurement / model selection commitments (architecture decision below).

## Sub-task checklist

Mapped from the `[A]` / `[H]` children on the GitHub issue. Each `[A]` is agent-delegatable as
its own child issue in `juge.ca`; each `[H]` is a human/counsel gate.

### Foundation
- [ ] **[A] Agent contract + orchestrator.** Define an `AgentContract` type capturing
  `{ scope, jurisdiction, lang, boundary, confidenceModel, auditHooks }`. Build an orchestrator
  that reuses the existing Anthropic client and `lib/ai/prompt-safety.ts`, and persists every
  run as `{ prompt, output, model, confidence, citations[], audit_id }`. The contract is the
  enforcement seam: an agent literally cannot emit outside its declared `boundary`.
- [ ] **[A] Provenance + citation pipeline.** A shared post-processor that (a) runs every
  emitted citation through `lib/citations.ts` and **drops the output** on any unresolved
  citation, and (b) stamps the output via `lib/legal/disclaimer.ts`. Reused by every agent.
- [ ] **[A] Audit-event emission.** Each run emits an audit event (audit id linked into the
  persisted run record) so the chain is reconstructable end-to-end.

### Agents
- [ ] **[A] Triage agent.** Classify a Dispute/Matter (#100) → boundary-safe **next-step
  OPTIONS only** (never a directive). On low confidence: "unknown → route to a professional."
  No fabricated procedure names.
- [ ] **[A] Deadline-watch agent (advisory).** Reads the deterministic deadline engine and
  explains / surfaces upcoming deadlines. **A test must prove it cannot create or alter a
  deadline record** (write path is structurally unavailable, not merely unused).
- [ ] **[A] Evidence-summarizer.** Produces a narrative built **only** from verbatim spans
  obtained via `evidence-extraction.ts`; **every sentence is cite-anchored** to a span; any
  uncited claim is **rejected** before the output is returned.
- [ ] **[A] Draft-assistant.** Generates draft text stamped with `lib/legal/disclaimer.ts`
  and run through `lib/citations.ts`; no invented authorities; clearly labeled as a draft for
  human review.
- [ ] **[A] Opposing-argument-analyzer.** Surfaces the likely counter-arguments / weaknesses
  as analysis (information, not advice); same disclaimer + citation discipline.

### Surface + metering
- [ ] **[A] Per-agent metering.** Usage / cost metered per agent (feeds existing billing /
  quota mechanism). Confidence and provenance are first-class in the metered record.
- [ ] **[A] Confidence / provenance UI.** Extend `Copilot.tsx` so each agent output shows its
  confidence band, its cited spans (click-through to source), the disclaimer, and a
  human-review affordance when confidence is low/medium.

### Gate
- [ ] **[H] Counsel sign-off + UPL red-team per jurisdiction** before *any* agent is enabled
  in a `live` edition. Boundary correctness is the product; sign-off is per launched edition
  (QC / US), not global.

## Human / architecture / counsel decisions required

These are **gates**, not tasks — no `[A]` work may be enabled in a `live` edition until the
corresponding decision is recorded.

1. **UPL / unauthorized-practice red-team (counsel, per jurisdiction).** The "information, not
   advice" boundary is a legal determination, not an engineering default. Required before any
   agent ships live in a given edition. (Shared with #467; same gate, this epic's instance.)
2. **Model / provider posture (architecture).** Which model(s) back the roster, data-residency
   and retention terms, and the confidence-scoring method are architecture decisions. **Per the
   HARD RULES no monetization / compliance gate flag or attestation may be flipped by an
   agent** — provider commitments and any compliance attestation stay human-owned.
3. **Confidence-threshold policy (counsel + architecture).** The numeric low/medium/high bands
   and the "route to professional" cutoff are policy, not a magic number; they gate when a
   human must be in the loop and so are jurisdiction-sensitive.
4. **Audit-record retention & privacy posture (counsel + privacy).** Persisting
   `{prompt, output, citations, ...}` per run is Law 25 / PIPEDA / GDPR-relevant
   (data minimization, retention, access). The retention window and redaction rules need a
   recorded posture before the orchestrator persists prod data.
5. **Deadline-engine boundary (architecture).** Confirm the structural mechanism that makes the
   deadline-watch agent write-incapable (separate read-only role / no write surface), so the
   "advisory only" guarantee is enforced by construction, not by review.
6. **Disclaimer / citation source-of-truth (counsel).** Confirm `lib/legal/disclaimer.ts`
   wording and the authoritative citation corpus behind `lib/citations.ts` per jurisdiction, so
   "no fabricated citation" has a concrete oracle to check against.

## First safe slice

**Build the agent contract + orchestrator + provenance/citation post-processor — with no live
agent enabled — behind the existing copilot, plus the deadline-watch "cannot write" test.**

Why this first:
- It is the **highest-leverage, lowest-ambiguity** slice: it adds the *enforcement seam*
  (contract boundary + citation-resolution gate + audit persistence) **without exposing any new
  advice surface**, so it needs no new counsel sign-off to land — it strengthens guardrails
  rather than introducing UPL risk.
- It de-risks every downstream agent: once the contract refuses to emit an unresolved citation
  and persists a full audit record, each agent becomes a thin, reviewable specialization on top
  of a proven-safe base.
- The deadline-watch **negative test** ("cannot create/alter a deadline record") can land in the
  same slice as a structural guarantee even before the agent's read path is wired, locking in
  the advisory-only invariant up front.

Concrete shape of the first slice (executed in `juge.ca`, not here):
1. Add the `AgentContract` type and the orchestrator that reuses the Anthropic client and
   `lib/ai/prompt-safety.ts`; persist `{ prompt, output, model, confidence, citations[],
   audit_id }` (additive migration with the next free number for the run-record table).
2. Add the shared post-processor: route every citation through `lib/citations.ts` and **drop the
   output** on any unresolved citation; stamp via `lib/legal/disclaimer.ts`.
3. Add tests: (a) an output carrying a fabricated citation is rejected; (b) a deadline-watch
   stub has **no** path to write a deadline record (zero write capability proven); (c) low
   confidence routes to human.
4. Keep all five concrete agents **disabled** (no `live` exposure) pending the counsel/UPL gate.
5. Run the application gates in `juge.ca`: `tsc --noEmit` (no new errors in touched files) and
   `npm run check:locales` if any user-facing string changes.
6. Open the slice as its own PR referencing **#463**, linked under #470.

Everything else in #463 stays behind the per-jurisdiction counsel / UPL gate and is fanned out
into standalone child issues on demand.

## Definition of done for this planning issue

- [x] Repository context recorded (work lands in `juge.ca`; this is the planning-of-record).
- [x] Scope, differentiator, and the six non-negotiable guardrails captured.
- [x] Concrete `[A]` / `[H]` sub-task checklist rolled up from the issue.
- [x] Human / architecture / counsel decision gates enumerated.
- [x] First safe slice named, justified, and sequenced (contract + provenance base, no live agent).
- [ ] (Follow-up, in `juge.ca`) implement the first slice as its own PR (Refs #463).
