# Plan — Issue #488: 🟡→🟢 Platform Readiness Roadmap

> **Mode:** PLAN (epic / human-gated). This document is the deliverable. Do **not** build the
> feature from this issue in one pass — the roadmap below is decomposed into agent-buildable
> `[A]` slices and human/counsel-gated `[H]` slices that must be tracked as their own issues/PRs.

- **Issue:** [meta] 🟡→🟢 Platform Readiness Roadmap — phases, green-definition, critical path
- **Source repo of record:** `juge.ca` (the roadmap describes the juge.ca platform).
- **This repo:** `annoncedenounce.com` is the static launch site and operating-canon mirror of
  juge.ca (see `docs/OPERATING_CANON.md` → "Reference implementation patterns: `juge.ca`"). This
  plan is filed here as the shared planning artifact so the roadmap, green-definition, and critical
  path are version-controlled alongside the operating canon. The `[A]` code slices land in the
  repository that owns each subsystem (mostly `juge.ca`).
- **Refs #488**

---

## 1. Definition of Green (the gate)

A readiness item is **🟢 Green** only when it is **all** of:

1. **Implemented** — feature code merged on `main`.
2. **Tested** — automated coverage (unit/integration/e2e as appropriate) green in CI.
3. **Monitored** — emits metrics/errors to telemetry with an alert path.
4. **Documented** — runbook + user/ops docs exist and are linked from the item.
5. **Secure** — secrets handled correctly, authz/RLS enforced, abuse paths considered.
6. **Recoverable** — backup/restore or replay path proven (not just assumed).
7. **Generating value** — the happy path produces the business outcome end-to-end
   (money flows, email/SMS delivers, content publishes, etc.).

Anything short of all seven is **🟡 Yellow**. "Code merged" alone is **not** green.

**Legend:** `[A]` = agent-buildable now · `[H]` = needs human credentials/accounts/counsel.

---

## 2. Phases & green-gates

### Phase 1 — Revenue Protection (P0 — nothing matters if money can't flow)

| Item | Issues | Gate to green | Class |
|---|---|---|---|
| Provider payouts | #422 · #413 (#446/#447) · #59 | Stripe Connect onboarding + payout config | `[H]` |
| Attorney monetization | #413 (#443/#444/#445) · #60 | counsel-approved fee model + Stripe | `[H]` |
| Transactional email | #420 · #61 | Resend/Bird/SES account + verified domain — **also fixes #103 magic-link** | `[H]` |
| Transactional SMS | #420 · #61 | Twilio/Bird account | `[H]` |
| Order notifications | #414 (#428–432) · #459 | buildable; rides the email/SMS rails | `[A]` |

### Phase 2 — Identity & Acquisition (P1)

| Item | Issues | Gate | Class |
|---|---|---|---|
| Google OAuth | #421 · #473 | Google Cloud OAuth client | `[H]` |
| Google Drive import | #421 · #58 | OAuth scopes + consent screen | `[H]` |
| HubSpot CRM | NEW | `HUBSPOT_TOKEN` (pending) | `[H]` |
| authorityBankApi | NEW ⚠️ | **needs definition before build** (verify funds / ownership / settlement / trust accounting?) | `[H]` design |

### Phase 3 — Legal Intelligence (P1 — the moat)

| Item | Issues | Gate | Class |
|---|---|---|---|
| Upload analysis (ID doc → parties/dates/deadlines → timeline) | #463 (evidence-summarizer) + evidence-extraction; NEW epic | buildable | `[A]` |
| Legal content chain (source→review→translate→publish→SEO→distribution) | #377 · #468 | build + human review | `[A]` + `[H]` review |
| Attorney ethics memo (approved) | #413 (#448) | counsel | `[H]` |

### Phase 4 — Trust & Compliance (P1 — investor-grade)

| Item | Issues | Gate | Class |
|---|---|---|---|
| CSAM safety | #419 | PhotoDNA/Thorn + reporting pathway | `[H]` |
| Encryption keys (KMS, rotation, secrets, env separation) | NEW | KMS provider | `[A]` + `[H]` |
| AI governance + audit log (prompt/user/ts/result/model) | #463 · #129 | buildable | `[A]` |

### Phase 5 — Stability (P2)

| Item | Issues | Gate | Class |
|---|---|---|---|
| Error telemetry (Sentry/PostHog/OTel) | #436 | Sentry account | `[A]` + `[H]` |
| Rate limiting (AI/login/uploads/search; per user/IP/key) | NEW | buildable | `[A]` |

---

## 3. Critical-path blockers (these gate Phase 1 → green)

1. **`[H]` You** — Stripe Connect, Resend/Bird/Twilio accounts, counsel-approved fee model.
   Code is ready / being built; it cannot generate value without these credentials.
2. **#103** — Supabase dashboard lockout blocks auth + email config. Recover or rebuild per
   `docs/SUPABASE_RECOVERY_RUNBOOK.md`.
3. **Build OOM** — 2,557 static pages → ~16-min builds + intermittent SIGKILL. Blocks fast/reliable
   shipping of **every** phase. **Fix first** — it is an enabler, not a Phase-5 feature.

---

## 4. Sub-task checklist (track each as its own issue/PR)

### Enablers (do first — unblock everything)
- [ ] **OOM/build perf** — profile the 2,557-page build; shard or incrementally render; cap peak
      memory; add a CI build-time + memory budget check. (gate: build < target time, no SIGKILL)
- [ ] **#103 Supabase recovery** — execute `docs/SUPABASE_RECOVERY_RUNBOOK.md`; restore dashboard
      access or rebuild project; re-link auth + email config.

### Phase 1 — Revenue Protection (P0)
- [ ] `[A]` Order notifications (#414 / #428–432 / #459) — wire to email/SMS rails behind a feature
      flag; no-op safely until rails are live.
- [ ] `[H]` Stripe Connect onboarding + payout config (#422 / #59).
- [ ] `[H]` Attorney fee model approved by counsel, then Stripe wiring (#413 #443–445 / #60).
- [ ] `[H]` Transactional email provider + verified domain (#420 / #61) — unblocks #103 magic-link.
- [ ] `[H]` Transactional SMS provider (#420 / #61).

### Phase 2 — Identity & Acquisition (P1)
- [ ] `[H]` Google OAuth client (#421 / #473).
- [ ] `[H]` Google Drive import scopes + consent screen (#421 / #58).
- [ ] `[H]` HubSpot CRM token + integration (NEW).
- [ ] `[H]` **authorityBankApi — write a design spec first** (see §5). No build until scope is fixed.

### Phase 3 — Legal Intelligence (P1)
- [ ] `[A]` Upload analysis pipeline (#463 + evidence-extraction; NEW epic).
- [ ] `[A]` + `[H]` Legal content chain (#377 / #468) — automate source→publish; human review gate.
- [ ] `[H]` Attorney ethics memo approved (#413 / #448).

### Phase 4 — Trust & Compliance (P1)
- [ ] `[H]` CSAM safety (#419) — PhotoDNA/Thorn + mandated reporting pathway.
- [ ] `[A]` + `[H]` Encryption keys / KMS / rotation / secrets / env separation (NEW).
- [ ] `[A]` AI governance + audit log (#463 / #129) — prompt/user/ts/result/model.

### Phase 5 — Stability (P2)
- [ ] `[A]` + `[H]` Error telemetry (#436) — Sentry/PostHog/OTel.
- [ ] `[A]` Rate limiting (NEW) — AI/login/uploads/search; per user/IP/key.

---

## 5. Human / Architecture / Counsel decisions required

These cannot be agent-decided. They block the corresponding `[H]` slices.

| Decision | Owner | Blocks |
|---|---|---|
| Provider/attorney **fee model & split** (rates, who pays Stripe fees, refunds) | Counsel + you | Phase 1 monetization |
| Stripe **Connect account type** (Express/Custom) + KYC/payout cadence | You + Stripe | Provider payouts |
| Transactional **email/SMS vendor** choice + verified sending domain | You | Phase 1 rails, #103 magic-link |
| **authorityBankApi scope** — verify funds vs. ownership vs. settlement vs. trust accounting; regulatory posture | Architecture + counsel | Phase 2 (do not build until defined) |
| **CSAM** detection vendor (PhotoDNA/Thorn) + mandated-reporting workflow + jurisdiction | Counsel + you | Phase 4 trust |
| **KMS provider** + key-rotation policy + env separation boundaries | Architecture | Phase 4 encryption |
| **Telemetry vendor** (Sentry/PostHog/OTel) + data-retention/PII policy | You + counsel | Phase 5 |
| Google **OAuth/Drive consent screen** branding + scope justification | You | Phase 2 identity |
| **Green sign-off authority** — who declares an item 🟢 against the 7-point definition | You | every item |

---

## 6. First safe slice (start here)

**Slice 0 — Build-OOM enabler (agent-buildable, no human gate, unblocks every phase).**

Rationale: per §3 blocker #3, the OOM/build instability blocks reliable shipping of *all* phases,
needs no credentials or counsel, and carries no monetization/compliance/legal posture risk. It is
the highest-leverage, lowest-risk `[A]` start.

Concrete steps (in `juge.ca`, as its own issue/PR — additive only):
1. Measure: capture current build wall-time and peak RSS for the 2,557-page build (one CI run).
2. Identify the hotspot: per-page data fetching, image processing, or in-memory accumulation.
3. Apply the smallest fix that lowers peak memory (e.g. stream/shard page generation, batch with
   bounded concurrency, or move heavy work out of the static build).
4. Add a CI guard: fail the build if wall-time or peak memory exceeds an agreed budget.
5. Document the budget + how to re-measure in the build runbook.

**Definition of done for Slice 0:** build completes with no SIGKILL, under the agreed time/memory
budget, with a CI guard and runbook entry (Implemented · Tested · Monitored · Documented).

**Parallel `[A]` track while `[H]` gates are pending:** Order notifications (#414) and AI governance
audit log (#129/#463) can be built behind feature flags so they no-op safely until the email/SMS and
monetization rails are live — code is ready before the credentials arrive.

---

## 7. Notes & cross-repo caveat

- GitHub issue references are per-repository. "Refs #488" in *this* (`annoncedenounce.com`) PR points
  to this repo's numbering; the **authoritative epic is juge.ca#488**. When sub-task issues are opened
  for the `[A]`/`[H]` slices above, open them in `juge.ca` and link back to `juge.ca#488`.
- This plan changes **only** `docs/plans/issue-488.md`. It touches no code, no version metadata
  (`version.json`/`package.json`), no monetization/compliance gate flags, and no migrations — per the
  PLAN-mode hard rules.
