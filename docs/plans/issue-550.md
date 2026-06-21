# Plan — Issue #550: §29 AI-Layer, needs-design tier (orchestration, RAG, RLS-scoped, live-LLM)

Status: PLAN (epic / human-gated). Do not auto-build.
Filed: 2026-06-21. Mode: design plan only — the doc is the deliverable.

## 0. Repository scope note (read first)

Issue #550 lives in **`PresidentAnderson/juge.ca`**, not in this repository
(`PresidentAnderson/annoncedenounce.com`). The items it tracks reference files
that exist only in juge.ca:

- `app/api/ai/copilot/route.ts` — the live Anthropic copilot route
- `lib/ai/*`, `lib/litigation/*`, `lib/analytics/*`, `lib/legal/*` — the §29
  additive primitives already shipped (v7.27.51–.56)
- Supabase RLS-scoped tables, Stripe metering, `audit_logs` / `ai_audit_events`

`annoncedenounce.com` is a static launch site (`index.html`, `privacy.html`,
no `lib/`, no `app/`, no AI route). Per `docs/OPERATING_CANON.md` this repo
"follows the same operating shape as the stronger AXAI/sovereign repos" and
names juge.ca as the reference implementation. The build for #550 therefore
belongs in juge.ca; this plan is the design artifact that lets a human gate it.

**Human decision required:** confirm #550 is executed against juge.ca and, if a
PR is wanted in this repo solely to carry the plan, that this doc satisfies it.
No production AI code is changed here.

## 1. Scope

Issue #550 is the "needs-design" remainder of §29 AI-Layer: the parts that touch
live data, Supabase RLS, the orchestration runtime, or real model wiring. The 34
additive primitives already shipped autonomously. What remains is wiring them
into the live copilot path with enforcement, persistence, and counsel-reviewed
guardrails. Each sub-item is sensitive: it edits the paid, live LLM route that
holds RLS access to user matter/PII, Stripe metering, and audit writes.

Sub-items carried by the issue:

- 29.16 Agentic Workflow AI — enforce capability gate / forbidden actions at the
  live copilot boundary.
- 29.17 AI Memory & Context — wire scoped-context guard into the live route;
  resolve the user's real grant set from RLS-scoped tables.
- 29.18 AI Output Review System — persisted review-record storage + RLS-scoped
  approval/rejection API + UI; gate legal-document workflow on review status.
- 29.19 AI Safety & Legal Guardrails — wire output guardrails into the copilot
  route (verdict in response + audit); decide fail-open vs fail-closed.
- 29.21 AI Feedback Loop (flagged out of scope) — persist + wire feedback into
  the live loop; depends on the unbuilt 29.22 RAG + prompt-versioning infra.

## 2. Sub-task checklist (build order, juge.ca)

Ordered so each slice is independently reviewable and the data/security surface
is established before live-route enforcement.

### Foundation (data + audit surface) — must precede any enforcement
- [ ] Design the RLS-scoped schema: grant set table (29.17), review records
      table (29.18), feedback table (29.21). Additive migrations only, next free
      number, RLS policies reviewed by security.
- [ ] Confirm `audit_logs` / `ai_audit_events` shapes can carry: capability-gate
      decisions, scoped-context decisions, guardrail verdicts, review state
      transitions. Extend additively if needed.
- [ ] Define the audit-event contract (typed) shared by all four enforcement
      points so the route writes one consistent record per decision.

### 29.19 Guardrails verdict (lowest-risk live wiring first)
- [ ] Run the already-shipped guardrail helpers over copilot output; attach a
      non-blocking `verdict` to the response and write it to audit (fail-open).
- [ ] Add a route/next-build test asserting the verdict is present + audited.
- [ ] HUMAN/COUNSEL GATE: decide fail-open vs fail-closed before enabling any
      blocking behavior. Ship observe-only until that decision lands.

### 29.16 Capability gate enforcement
- [ ] Resolve the agent roster + forbidden-action set at the route boundary.
- [ ] Enforce: block forbidden actions before the LLM call / before tool exec;
      audit every block. HITL approval path for gated-but-allowed actions.
- [ ] Test forbidden-action denial + audit.

### 29.17 Scoped-context guard
- [ ] Resolve the user's actual grant set from the new RLS-scoped table via
      `getSupabaseServer` / `getUser`.
- [ ] Filter context fed to the LLM to the grant set; audit drops.
- [ ] HUMAN/SECURITY GATE: revocation-propagation design (how a revoked grant
      invalidates in-flight / cached context).

### 29.18 Output review system
- [ ] Persist review records on copilot output for legal-document workflows.
- [ ] RLS-scoped approve/reject API + minimal UI wiring.
- [ ] Gate the legal-document workflow on review status (no publish/act until
      approved). HITL design reviewed by counsel.

### 29.21 Feedback loop (deferred — flag only)
- [ ] Out of scope until 29.22 (RAG + prompt-versioning + audit infra) exists.
      Persist feedback only after the learning-loop architecture is approved.

## 3. Human / architecture / counsel decisions required

1. **Fail-open vs fail-closed** for guardrail BLOCK on a paid response (29.19) —
   product + legal + UX. Blocks the rest of enforcement.
2. **UPL / guardrail posture** for agentic forbidden actions (29.16) — counsel.
3. **RLS grant-set model + revocation propagation** (29.17) — security +
   architecture; defines new tables and their policies.
4. **Legal HITL review workflow** for AI-authored legal documents (29.18) —
   counsel; what must be human-approved before it can act/publish.
5. **Learning-loop / RAG architecture** (29.21 + 29.22 dependency) — architecture;
   prompt versioning, retrieval, and how feedback improves prompts/agents.
6. **Stripe metering interaction** — does a blocked/failed guardrail response
   still meter? Product + billing.
7. **Cross-repo execution confirmation** — see §0.

## 4. First safe slice

The smallest correct, reviewable first build (in juge.ca, after the §0 and §3.1
gates): **29.19 guardrails in observe-only mode.** Run the existing guardrail
helpers over copilot output, attach a `verdict` field to the response, and write
the verdict to `ai_audit_events` — strictly fail-open, no blocking. This:

- changes behavior only additively (a new response field + an audit write),
- requires no new RLS table,
- produces the audit signal needed to later choose fail-open vs fail-closed with
  real data,
- is coverable by one route/next-build test.

Everything that blocks a paid response, persists RLS-scoped state, or resolves a
grant set stays behind the human/counsel gates above.

## 5. Out of scope / hard rules respected

- No edits to `lib/version.ts`; no monetization/compliance gate-flag or
  attestation flips.
- Migrations additive-only, next free number (when the build lands in juge.ca).
- This PR (annoncedenounce.com) adds only this plan doc — no AI/route code.

Refs #550
