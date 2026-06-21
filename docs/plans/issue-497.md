# Plan — Issue #497: gap-spotter — real platform gaps (verified on main)

Status: PLAN (cross-repo / operator-gated). Do not auto-build in this repo.
Filed: 2026-06-21. Mode: design plan only — the doc is the deliverable.

## 0. Repository scope note (read first)

Issue #497 lives in **`PresidentAnderson/juge.ca`**, not in this repository
(`PresidentAnderson/annoncedenounce.com`). Every gap it tracks references files
that exist only in juge.ca and have no analogue here:

- service-funnel orders, the Matter↔Marketplace bridge (#459) — juge.ca `lib/`/`app/`
- `authorityProviderState()` / `lib/legal/authority-bank.ts`, `lib/ops/legal-suite-readiness.ts`
- `NEXT_PUBLIC_EDITION` + `.env.example`, `middleware.ts`, `vercel git connect` for `juge-ca`
- transactional email/SMS providers (#420), `transactionalEmail` live-mode gate (#410)

`annoncedenounce.com` is a static launch site (`index.html`, `privacy.html`,
no `lib/`, no `app/`, no Supabase, no editions, no `.env.example`). The build for
#497 therefore belongs in juge.ca. This repo's worktree cannot push juge.ca code
(different git remote), and the operating rules require staying on this worktree's
branch. Per the precedent set by `docs/plans/issue-550.md` (the identical
cross-repo case), this plan is the design artifact that lets a human gate the
work; no production code is changed here.

**Human decision required:** confirm #497 is executed against juge.ca, and that a
plan-carrying PR in this repo (Refs #497) is acceptable to keep the issue tracked.

## 1. Current state on `origin/main` (juge.ca) — re-verified 2026-06-21

The issue title claims gaps are "verified on main", but juge.ca main has moved.
Re-checking each of the four items against the live `juge.ca` checkout:

1. **Service-funnel orders are localStorage-only — no Supabase write/API.**
   STILL OPEN. This is the substantive gap. The Matter↔Marketplace bridge (#459)
   has no server-side persistence for funnel orders, so the bridge is hollow.

2. **`authorityBankApi` health flag conflates US/CA.**
   ALREADY ADDRESSED on main. `authorityProviderState()` in
   `lib/legal/authority-bank.ts` returns split booleans
   (`courtListener` and `canlii` independently), and
   `lib/ops/legal-suite-readiness.ts` reports `courtlistener` (status `ready`/`mock`)
   and `canlii` (status `ready`/`blocked`) as separate checks. No conflation remains.
   Action: close this sub-item after a confirming review; add a regression test if
   one does not already exist.

3. **`NEXT_PUBLIC_EDITION` undocumented (no `.env.example`).**
   PARTIALLY ADDRESSED on main. `.env.example` exists and documents
   `NEXT_PUBLIC_EDITION=qc` plus `NEXT_PUBLIC_EDITION_QC_URL`,
   `NEXT_PUBLIC_EDITION_US_URL`, `NEXT_PUBLIC_EDITION_SUBDOMAIN_ROUTING`.
   Remaining: the `vercel git connect` on the `juge-ca` Vercel project is an
   operator action (silent CA deploy risk) — not a code change.

4. **Transactional email/SMS providers unprovisioned (#420);
   `transactionalEmail=false` in prod (gated on operator [H], see #410).**
   OPEN BY DESIGN. `.env.example` already carries the provider slots
   (`RESEND_API_KEY`, `NOTIFY_EMAIL_*`, `TWILIO_*`, `TRANSACTIONAL_SMS_LIVE`).
   Flipping the live gate is an operator/compliance decision [H], NOT an
   autonomous code change. HARD RULE: do not flip monetization/compliance gate
   flags or attestations.

Net: of four gaps, one is genuinely code-actionable (#1), one needs only a
confirming review + optional test (#2), and two are operator/compliance-gated
(#3 deploy wiring, #4 provider provisioning + live gate).

## 2. Sub-task checklist (build order, in juge.ca)

### Slice A — first safe slice: service-funnel server persistence (gap #1)
- [ ] Add an additive Supabase migration (NEXT free number, additive-only) for a
      `service_funnel_orders` table: id, matter_id (nullable FK), edition,
      service_type, status, payload jsonb, created_at, updated_at. RLS enabled;
      owner-scoped select/insert policies reviewed by security.
- [ ] Add a server route `app/api/marketplace/orders/route.ts` (POST create, GET
      list-own) that writes/reads via the server Supabase client, replacing the
      localStorage-only path. Validate input with the existing zod/validation
      pattern; never trust client-supplied owner ids — derive from session.
- [ ] Update the client funnel to call the API and treat localStorage only as an
      offline draft cache, not the source of truth.
- [ ] Wire the Matter↔Marketplace bridge (#459) to the persisted order so the
      bridge is no longer hollow.
- [ ] Tests: route handler unit test (auth + RLS-scoped behaviour), and update
      `tests/marketplace-funnel.spec.ts` to assert server persistence.

### Slice B — authority health flag (gap #2): confirm + lock in
- [ ] Review `authorityProviderState()` and `legal-suite-readiness.ts` confirm
      US/CA stay split; add/extend a regression test so a future change cannot
      re-conflate them. Then close the sub-item.

### Slice C — edition docs/deploy (gap #3): operator
- [ ] Confirm `.env.example` edition block is complete (it is); add a short
      `docs/EDITIONS.md` note if discoverability is still weak.
- [ ] OPERATOR: run `vercel git connect` on the `juge-ca` project to remove the
      silent CA deploy risk. Not a code task.

### Slice D — transactional comms (gap #4): operator/compliance
- [ ] OPERATOR/COUNSEL: provision Resend + Twilio creds (#420) and decide the
      `transactionalEmail` / `TRANSACTIONAL_SMS_LIVE` live-gate flip (#410, [H]).
      Agents must NOT flip these flags.

## 3. Decisions required (human / architecture / counsel)

- [H, architecture] Schema + RLS policy shape for `service_funnel_orders`
  (Slice A) — security review before merge.
- [H, ops] `vercel git connect` for the `juge-ca` project (Slice C).
- [H, compliance/counsel] Provider provisioning and live-gate flip for
  transactional email/SMS (Slice D, #410/#420) — explicitly out of agent scope.

## 4. First safe slice to execute (in juge.ca)

Slice A, step 1+2: the additive migration for `service_funnel_orders` plus the
RLS-scoped `app/api/marketplace/orders` route. This is additive (next free
migration number), touches no gate flags, no attestations, and not
`lib/version.ts`. It converts the hollow bridge (#459) into a persisted one and
is the highest-leverage, lowest-risk step. Execute it in the juge.ca repo, run
`tsc --noEmit` and `npm run check:locales`, then open a PR there against
`juge.ca` main referencing #497 and #459.
