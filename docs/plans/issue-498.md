# Issue #498 — meta-agent-supervisor: network overlaps + missing roles

Status: plan / handoff (the real fix targets files outside this repo — see "Repo & file-location caveat").
Audited: 2026-06-21. Source issue: `PresidentAnderson/juge.ca#498` (labels: documentation, priority:low, triage).

## Repo & file-location caveat (read first)

This worktree is for `PresidentAnderson/annoncedenounce.com`, but issue #498 was filed
against `PresidentAnderson/juge.ca`. The artifacts the issue is about — the agent roster —
do **not** live in either git repository. They are user-global Claude config files in
`~/.claude/agents/*.md` (confirmed: that directory is not a git work tree).

Because of that, the substantive edit cannot be staged into a PR in this repo without
violating the "stay in your worktree / touch only relevant files" rule. This document is
the deliverable: an audit of the current state plus the exact, ready-to-paste edit a human
(or an autonomy pass running with write access to `~/.claude/agents/`) should apply.

## Scope of the issue

From the 2026-06-20 `meta-agent-supervisor` pass on the 9-agent network:

1. **Overlaps** to disambiguate in the agent descriptions:
   - `codex-work-reviewer` = the single default post-Codex gate.
   - `gap-spotter-orchestrator` = reserved for in-flight multi-agent sprints only.
   - `meta-agent-supervisor` = periodic network-health audits only (never per-feature).
   - `uiux-flawless-flow` (broken/unusable) vs `product-design-visionary` (works-but-bland)
     need a tiebreaker sentence.
2. **Missing roles** to create: Stripe/payments, Supabase RLS/data-security, release/deploy
   guardian, i18n/bilingual QA, SEO/growth.

## Audit findings — what is ALREADY done

Verified by reading `~/.claude/agents/` on 2026-06-21. Almost the entire issue is resolved:

### Overlaps — 3 of 4 already encoded
- `meta-agent-supervisor.md`: description already states SCOPE is "the AGENTS THEMSELVES …
  NOT on product code or shipped features", routes shipped-work review to
  "codex-work-reviewer (the default post-build gate)" and in-flight gap-spotting to
  `gap-spotter-orchestrator`. DONE.
- `codex-work-reviewer.md`: description already says "THIS IS THE DEFAULT POST-CODEX REVIEW
  GATE … route here — NOT to gap-spotter-orchestrator … and NOT to meta-agent-supervisor".
  DONE.
- `gap-spotter-orchestrator.md`: description already says "use this ONLY for live oversight
  WHILE a multi-agent build is still in flight … For a quality review of COMPLETED Codex/
  agent work (the default post-build gate), use codex-work-reviewer instead." DONE.

### Missing roles — all 5 already created (files dated 2026-06-20)
- [x] `stripe-payments-specialist.md` — webhook sig verification, idempotency, edition-aware
      accounts, payouts/Connect, monetization-gate awareness.
- [x] `supabase-rls-reviewer.md` — RLS-on + owner-scoped policies, service-role ownership
      checks, Law 25 / PIPEDA PII handling.
- [x] `release-deploy-guardian.md` — release-points version scheme + en/fr changelog
      lockstep, Codex-concurrency / worktree-isolation / green-build-before-merge rules.
- [x] `i18n-qa.md` — en/fr/es parity, `check:i18n-gap` / `check:locales` gates, Loi 96.
- [x] `seo-specialist.md` — sitemaps/`localePaths`, hreflang/canonicals, structured data.

## The ONE remaining sub-task

- [ ] Add the **uiux-flawless-flow vs product-design-visionary tiebreaker sentence**.
      Neither agent's file currently cross-references the other (grep returned nothing in
      both `~/.claude/agents/uiux-flawless-flow.md` and
      `~/.claude/agents/product-design-visionary.md`).

### First safe slice (exact, mechanical edit — no judgment required)

Append one routing sentence to each agent's `description` field. Proposed wording:

- In `~/.claude/agents/uiux-flawless-flow.md` (end of the `description`):
  > "Tiebreaker vs product-design-visionary: route here when the experience is broken or
  > unusable — dead links, lost users, confusing flows, controls that don't work. If the UI
  > functions but merely looks plain/bland, use product-design-visionary instead."

- In `~/.claude/agents/product-design-visionary.md` (end of the `description`):
  > "Tiebreaker vs uiux-flawless-flow: route here when the UI works but is bland/generic and
  > needs elevated visual/brand direction. If the experience is actually broken or unusable
  > (dead links, lost users, broken controls), use uiux-flawless-flow instead."

This is a content-only edit to two global config files; it does not touch product code,
versioning, or any compliance/monetization gate.

## Decisions required from a human / architecture / counsel

- **Routing target (process):** decide who applies the `~/.claude/agents/` edit, since those
  files are not in version control. Options: (a) a human edits them directly; (b) an autonomy
  pass with home-config write access applies the tiebreaker; (c) bring the agent roster under
  version control so future supervisor passes can be PR-reviewed. Recommend (c) long-term.
- **No legal/compliance judgment** is needed for the tiebreaker itself — it is editorial.

## Verification once applied

- Re-grep both files for the cross-reference (`grep -ni "product-design-visionary"
  uiux-flawless-flow.md` and the reverse) — each should now match.
- Confirm the `description` front-matter still parses (single-line JSON-escaped string;
  keep the appended sentence inside the existing quotes, escape internal quotes).
- Close `juge.ca#498` once the tiebreaker lands; the other 8 checklist items are already met.
