# Plan — Issue #155: Part II/III/IX — Workspace Registry build-out

> **Mode:** PLAN (epic / human-gated). This document is the deliverable; no feature
> code is built here.
>
> **Target codebase:** `PresidentAnderson/juge.ca` (this is a cross-repo planning
> artifact). Issue #155, the registry, and every sub-issue (#132–#142) live in
> `juge.ca`. The annoncedenonce.com worktree is used only to author and carry this
> plan because the juge.ca main checkout has an active autonomy loop and a dirty
> working tree that must not be touched. All file paths below are **juge.ca** paths.

## 1. Scope

Issue #155 is the umbrella epic for finishing the **Workspace Registry** described in
`docs/WORKSPACE-REGISTRY.md` (v2.5 rev. g, the in-repo source of truth). Today ~6 of
the 23 registry workspaces exist as real routes (client, counsel, bailiff,
commissioner, investigator, admin). This epic builds:

1. the **shared professional-workspace foundation** (one shell, one module library,
   one assignment lifecycle) — sub-issue **#132**, the hard prerequisite; and
2. the remaining **spec-only workspaces** across the Professional, Executive,
   Internal, and Partner tiers — sub-issues **#133–#142**.

### What already exists (do not rebuild)

- **Data/logic layer is done.** `lib/workspaces/professional-registry.ts` already
  defines all 18 spec-only `ProfessionalWorkspaceKind`s, their `tier`, `modules`,
  `guardrails`, `protectedContent`, and `auditRequired`, plus the guardrail helper
  functions (mediation caucus isolation, arbitration equal-disclosure, notary
  minute-book hash chain, trustee separated accounting + fit-ranked matching,
  process-server append-only GPS attempts + blocked enforcement modules, paralegal
  scope/privilege gates, certified-artifact immutability, regulator read-only,
  governance content wall, release gates, internal-data modes, partner referral
  logging / de-identified research).
- **Governance + completion gate exist.** `lib/ops/platform-governance.ts` holds the
  12-family `PROFESSIONAL_WORKSPACES` governance array and `SHARED_WORKSPACE_MODULES`
  (`assignment-lifecycle`, `matter-context`, `secure-messaging`, `document-intake`,
  `deliverables`, `audit-log`). `lib/ops/open-issue-completion.ts` registers #132 and
  #155 with proof `["lib/ops/platform-governance.ts", "docs/WORKSPACE-REGISTRY.md"]`
  and gates `workspaceFoundationComplete()` on
  `PROFESSIONAL_WORKSPACES.length === 12 && SHARED_WORKSPACE_MODULES.includes("assignment-lifecycle")`.
- **Drift guard exists.** `lib/workspaces/__tests__/registry-governance-link.test.ts`
  asserts the governance array ↔ registry-kind link and the `length === 12` invariant.

### What this epic still needs (the actual gap)

The **route + UI shell build-out**: real `app/[lang]/app/<workspace>/page.tsx`
surfaces wired to the registry, the shared workspace shell/module library that
#132 introduces, and per-role module wiring for #133–#142 — each behind the
Part V security wall and audit substrate. The current `app/[lang]/app/professional`
and several role dirs are single-`page.tsx` stubs.

### Out of scope for #155

Marketplaces (#82, #84, #73 — related but separate), Part X Justice Economy engine,
Part XI revenue blocks, Criminal Justice (Part XII/XIV), and the funding workspaces
(Part VIII) except where a guardrail already shipped in the registry.

## 2. Sub-task checklist

Each child is its own issue/PR; #155 closes when all children land and the
completion gate + drift guard stay green.

- [ ] **#132 — shared professional-workspace foundation (G1–G5) — PREREQUISITE.**
  Build the shared shell consuming `SHARED_WORKSPACE_MODULES`: assignment lifecycle,
  matter-context provider, secure messaging, document intake, deliverables, audit
  log. One shell + role-module composition; no per-role forks. Define the route
  contract `app/[lang]/app/<slug>/page.tsx` that every later workspace plugs into.
- [ ] **#133 — `ws.mediator` (G10).** Joint session + party caucuses with caucus
  isolation (`visibleMediationRooms`) and without-prejudice failure export
  (`mediationFailureExportPolicy`). `protectedContent: walled`.
- [ ] **#134 — `ws.arbitrator` (G11).** Submissions inbox enforcing equal disclosure
  (`reviewArbitrationSubmission`), private deliberation, award addenda-only after
  rendering (`canMutateArbitrationAward`). `walled`.
- [ ] **#135 — `ws.notary` (G68).** Identity-verified act drafting + tamper-evident
  minute book (`canCreateAuthenticAct`, `sealMinuteBookEntry` hash chain), CNQ
  compliance checklist, walled access. `walled`.
- [ ] **#136 — `ws.trustee` + insolvency marketplace (G69–G70).** Separated estate
  accounting (`partitionEstateAccounting`), fit-ranked neutral matching with conflict
  exclusion (`rankTrusteeMatches`, `isTrusteeCandidateEligible`), OSB filings.
- [ ] **#137 — `ws.process_server` (G9).** Service requests, GPS-stamped append-only
  attempts (`appendServiceAttempt`), proof of service, territory validation, tariff
  calculator; **enforcement modules unreachable** (`canProcessServerReachModule`,
  `PROCESS_SERVER_BLOCKED_MODULES`).
- [ ] **#138 — `ws.paralegal` supervised + licensed (G26–G30).** Two profiles under
  one slug: drafting/exhibits/filing/intake with supervision-gate vs scope-gate,
  privilege flags immutable (`canParalegalModifyPrivilegeFlags`), no trust authority,
  distinct attribution (`paralegalAttribution`, `paralegalDraftStatus`).
- [ ] **#139 — court_reporter / translator / interpreter / regulator (G13/G14).**
  Certified-artifact immutability (`canModifyCertifiedArtifact`), translation bound
  to source version (`certifiedTranslationBinding`), regulator read-only
  (`canRegulatorAccessPartyData`).
- [ ] **#140 — founder / cto / founding_member (G31–G35, G52).** Executive tier;
  governance content wall (`canGovernanceAccessProtectedContent`), aggregate-only
  metrics (`governanceMetricMode`), release gates (`releaseGateCleared`),
  propose-only founding-member governance. `protectedContent: consent_or_support_access`.
- [ ] **#141 — developer / beta_tester / partner_developer (G36–G39, G43–G45).**
  Internal tier; synthetic/anonymized/sandbox data modes
  (`allowedInternalDataModes`, `canInternalWorkspaceUseRealMatterData`), log
  redaction (`redactDeveloperLog`), review-gated partner publishing
  (`canPublishPartnerApp`).
- [ ] **#142 — `ws.partner_org` + directory (G55–G57).** Partner directory profile,
  inbound/outbound referrals with consent-scope logging (`logPartnerReferral`),
  de-identified research export (`partnerResearchExportMode`), walled consent-only
  collaboration (`canPartnerOrgCollaborate`).
- [ ] **Epic close:** keep `registry-governance-link.test.ts` and
  `workspaceFoundationComplete()` green; add per-workspace route smoke/guardrail
  tests (target 95%+ per `docs/WORKSPACE-REGISTRY.md` §6).

## 3. Decisions required before build (human / architecture / counsel)

Each gate must be resolved by the named owner before the dependent slice is built.

| # | Gate | Owner | Why it blocks |
|---|------|-------|---------------|
| D1 | Shared shell route contract: confirm `app/[lang]/app/<slug>/page.tsx` is the canonical route shape for all 18 kinds, and how profiles (paralegal supervised/licensed, translator/interpreter) share one slug with module toggles. | Architecture | #132 defines the contract every later workspace consumes; a wrong shape forces rework of #133–#142. |
| D2 | Part V wiring: which crypto/consent/audit primitives (`lib/crypto/envelope.ts`, `lib/crypto/consent-token.ts`, `lib/security/audit-substrate.ts`) each tier binds to, and where the content wall is enforced (key separation vs UI). | Architecture + Security | "Ownership ≠ access" must be cryptographic, not UI-only; executive/partner tiers cannot ship without it. |
| D3 | Notary minute-book retention + CNQ compliance content (statutory retention, identity-verification standard). | Counsel (QC notarial / CNQ) | #135 emits authentic acts; legal correctness of retention + checklist is non-delegable. |
| D4 | Trustee OSB filing scope + insolvency marketplace fee/referral posture vs anti-champerty and BIA rules. | Counsel + Monetization | #136 touches regulated filings and a marketplace; fee model must not breach compliance gates. Do **not** flip any monetization/compliance flag. |
| D5 | Process-server enforcement boundary + per-jurisdiction tariff data + territory authorization source. | Counsel + Architecture | G9 forbids enforcement reachability; tariffs/territories are jurisdiction-as-data inputs. |
| D6 | Paralegal scope-of-practice gating per jurisdiction (supervised vs licensed authority). | Counsel | G28 scope gate and direct-hire eligibility differ by jurisdiction. |
| D7 | Certified-artifact legal-effect rules for court_reporter / translator / interpreter (what "certified + immutable" means evidentially). | Counsel | G13 immutability has evidentiary consequences. |
| D8 | Executive-tier Support Access UX + governance-vote model for founding_member (§4b, G40–G42, G52). | Founder / Architecture | Defines consent-or-support-access entry path and propose-only governance. |
| D9 | Partner-org de-identification standard (small-cell thresholds, direct-identifier list) for research export. | Counsel + Data/Privacy | `partnerResearchExportMode` defaults to block; the threshold definition is a privacy decision. |
| D10 | Test-coverage target + CI gate: confirm 95%+ per-guardrail target and that new routes don't regress `workspaceFoundationComplete()` or the drift guard. | CTO / QA | Completion gate and drift guard are the merge criteria for the epic. |

## 4. First safe slice (after D1 + D2 are answered)

Smallest correct, mergeable increment that unblocks the rest **without** touching
`lib/version.ts`, monetization/compliance flags, or attestations:

1. **#132 shared shell scaffold (read-only, no new data writes):** introduce the
   shared workspace shell component(s) and a single registry-driven route
   `app/[lang]/app/[slug]/page.tsx` (or per-slug pages following D1) that reads
   `getProfessionalWorkspace(kind)` from `lib/workspaces/professional-registry.ts`
   and renders the workspace title, tier, declared `modules`, and `guardrails` as
   inert panels behind the existing auth/wall. No mutations, no marketplace, no
   monetization surface.
2. **One vertical proof — `ws.mediator` (#133)** rendered through the new shell using
   the already-shipped `visibleMediationRooms` / `mediationFailureExportPolicy`
   helpers, with a viewer-scoped caucus-isolation smoke test, to validate that the
   shell + registry + guardrail-logic contract holds end to end.
3. **Keep green:** `lib/workspaces/__tests__/registry-governance-link.test.ts` and
   `workspaceFoundationComplete()`; add the mediator route guardrail test. Let CI
   (build-and-test) validate types — do not run tsc/tests locally at this scale.

This slice is additive (new routes/components + tests only), respects the Part V
wall, references the real registry, and proves the foundation contract before the
remaining nine sub-issues fan out.

## 5. References (juge.ca)

- `docs/WORKSPACE-REGISTRY.md` — canonical registry (source of truth).
- `lib/workspaces/professional-registry.ts` — 18 kinds + guardrail logic (shipped).
- `lib/ops/platform-governance.ts` — 12-family governance array + shared modules.
- `lib/ops/open-issue-completion.ts` — #132/#155 completion gate.
- `lib/workspaces/__tests__/registry-governance-link.test.ts` — drift guard.
- Children: #132 (prereq), #133–#142. Related marketplaces: #82, #84, #73.
