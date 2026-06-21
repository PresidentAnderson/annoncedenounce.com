# Issue #415 — Trust & ops hardening (epic / PLAN)

**Status:** PLAN ONLY. Human + counsel gated. Do not build the full epic from a single PR.
**Refs:** #415
**Mode:** Epic decomposition. This document is the deliverable; each sub-task below ships as its own small, reviewed PR.

## 1. Context & current ops surface

`annoncedenounce.com` is a static launch site deployed on Vercel (`vercel.json`, `outputDirectory: "."`,
`framework: null`). There is no application database yet. The trust-and-ops surface that exists *today* is:

- **Source of truth:** the GitHub repo itself (`PresidentAnderson/annoncedenounce.com`). All shipped content
  lives in `index.html`, `privacy.html`, `assets/`, plus release metadata (`package.json`, `version.json`).
- **Lead/contact data:** captured by embedded HubSpot forms (see `connect-src`/`frame-src` allowances in
  `vercel.json`). Personal data therefore lives in HubSpot, a third-party processor — **not** in this repo.
- **Release/version pipeline:** `scripts/bump-version.mjs`, `version.json`, `api/version.js`, and the
  workflows `auto-version-bump.yml`, `tag-release.yml`, `ci.yml`.
- **Autonomy controls:** `autonomous-agent-loop.yml`, `autonomy-pr-review-gate.yml`, `autonomy.defaults.yml`,
  `canon.lock.yaml`, `docs/OPERATING_CANON.md`.

Because there is no first-party datastore today, "backups/restore" and "retention" mostly mean **Git history +
Vercel deployment immutability + HubSpot's processor controls**, not database dumps. The plan reflects that
reality and stays additive. If/when a first-party datastore (e.g. for evidence intake, moderation, or
right-of-reply) is introduced, the database-specific slices below activate.

## 2. Scope

In scope for the epic (each a separate PR):

1. **Backups & restore** — document and verify recoverability of the only stateful surfaces we own
   (Git repo, Vercel project config, release metadata) and the third-party surface we depend on (HubSpot export).
2. **Retention** — define retention windows for logs, deployment artifacts, lead data in HubSpot, and (future)
   any first-party PII; align with the privacy posture already promised in `privacy.html`.
3. **Alerting** — uptime + error + deploy-failure alerting for the production site and `/api/version`.
4. **Rollback** — a documented, tested one-step rollback for a bad deploy (Vercel promote-previous +
   `tag-release` correlation) that does not violate the version-lockstep verifier.
5. **DPA (Data Processing Agreement)** — confirm/record signed DPAs with every sub-processor (Vercel, HubSpot,
   GitHub, any analytics), and publish the sub-processor list.

Out of scope (other epics): moderation pipeline, evidence intake, right-of-reply tooling, payment/monetization.

## 3. Sub-task checklist

- [ ] **415-a Recovery runbook** — `docs/ops/recovery.md`: how to restore the site from Git to a fresh Vercel
      project; RTO/RPO targets; how to re-link domain + env vars; verification via `npm run verify`.
- [ ] **415-b Backup verification job** — a scheduled (cron) GitHub workflow that exports critical config
      (repo archive checksum, `version.json`, sub-processor list) to an artifact and asserts it is restorable.
      Additive workflow only; must pass the existing review gate.
- [ ] **415-c Retention policy** — `docs/ops/retention.md`: GH Actions log/artifact retention, Vercel log
      retention, HubSpot lead-data retention + deletion-on-request flow. Cross-link from `privacy.html`
      (content change → **legal review required**, see §4).
- [ ] **415-d Uptime + error alerting** — health-check on `/` and `/api/version` (the latter already returns
      commit + release metadata). Wire to an existing channel (email to operator / GitHub issue on failure).
      Prefer a workflow-based synthetic check to avoid new paid dependencies; document the threshold.
- [ ] **415-e Deploy-failure alerting** — surface failed Vercel deploys and failed `ci.yml`/`tag-release`
      runs to the operator.
- [ ] **415-f Rollback runbook + guardrail** — `docs/ops/rollback.md`: Vercel "Promote previous deployment"
      steps, how to reconcile `version.json`/tags after a rollback **without** editing `lib/version.ts`-class
      canonical files or breaking the lockstep verifier. Include a dry-run checklist.
- [ ] **415-g Sub-processor register + DPA evidence** — `docs/ops/subprocessors.md` listing each processor,
      data categories, region, and DPA status. Publish a public sub-processor list link from `privacy.html`
      (content change → **legal review required**).
- [ ] **415-h (future, gated)** First-party datastore backup/restore + retention — only when a DB is
      introduced; migrations stay additive with the next free number; PII retention defaults conservative.

## 4. Decisions required before/while building (human / architecture / counsel)

| # | Decision | Owner |
|---|----------|-------|
| D1 | RTO / RPO targets for the launch site (proposed: RTO ≤ 4h, RPO = last Git commit). | Operator |
| D2 | Retention windows for HubSpot leads and the deletion-on-request SLA. | Operator + Counsel |
| D3 | Whether `privacy.html` and a public sub-processor list must be updated (almost certainly yes). Any change to privacy/legal copy is **counsel-gated** per `OPERATING_CANON.md`. | Counsel |
| D4 | Confirm signed DPAs exist with Vercel, HubSpot, GitHub (and any analytics) — collect the executed copies. | Counsel |
| D5 | Alerting channel + budget: workflow-only synthetic checks vs. a paid uptime provider (Vercel monitoring, Better Stack, etc.). | Operator + Architecture |
| D6 | Data-residency / region requirements (Canada / Québec — Law 25 implications) for any future first-party PII. | Counsel + Architecture |
| D7 | Rollback authority: who may promote a previous deployment in prod, and the post-rollback version-reconciliation rule. | Operator |

## 5. Constraints honored

- **No edits** to `version.json`/`package.json` version values, `api/version.js`, or any monetization/compliance
  gate flag or attestation in this PR.
- All future workflow/code slices are **additive**; any DB migration uses the next free number.
- Privacy/legal copy changes are deferred to counsel-gated slices (415-c, 415-g), never auto-merged.
- New ops workflows must pass `autonomy-pr-review-gate.yml` and keep `npm run verify` green.

## 6. First safe slice

**Ship 415-a first: the recovery runbook (`docs/ops/recovery.md`).**

Rationale: it is documentation-only, touches no shipped site files, no version metadata, and no legal copy, so
it carries zero compliance or availability risk while immediately raising the trust floor. It also forces us to
write down RTO/RPO (D1) and the restore path, which de-risks every later slice. Acceptance: the runbook lets a
second operator restore the production site from `git clone` to a verified Vercel deploy (`npm run verify`
green, `/api/version` responding) using only the document.

Suggested second slice: **415-f rollback runbook** (also docs-only, no canonical-file edits). Defer all
privacy/legal and paid-dependency slices until D2–D6 are answered.
