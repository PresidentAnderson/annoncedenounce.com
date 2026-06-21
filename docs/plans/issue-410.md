# Issue #410 — Operator action queue (items blocked on you)

> Canonical issue: `juge.ca#410` (cross-repo). This repo,
> **annoncedenounce.com**, is a static launch site that follows the same
> [Operating Canon](../OPERATING_CANON.md) as `juge.ca` (its reference
> implementation). The issue's line items live in the `juge.ca` product repo;
> this plan records the safe, in-scope slice shipped here.

## Scope

Issue #410 is an **operator-action-queue digest** produced by an autonomous
session: a list of work that is **blocked on the human operator** because it
needs credentials, dashboard access, a vendor account, a billing/legal
decision, or a destructive-action confirmation an agent must not self-authorize
(Supabase recovery `#103`, destructive user wipe `#68`, Stripe Connect `#59`,
marketplace monetization `#60`, email/SMS `#61`, CSAM `#57`, malware scan `#56`,
Drive OAuth `#58`, `INGEST_OWNER_ID` `#492`, gated payments `#384`).

None of those line items can be *resolved* by an autonomous agent — that is the
entire point of the queue. They also live in another repository
(`juge.ca`), which the autonomy rules forbid this worktree from touching.
What this repo **can** safely own is the canonical, auditable surfacing of the
queue, consistent with the canon's auditability principle.

## In-scope deliverable shipped in this PR

- `docs/OPERATOR_ACTION_QUEUE.md` — a maintained mirror of the operator-blocked
  queue, with priority, `[H]`/`[A]` markers, owning-issue links, and a
  "how to use" + maintenance procedure. This makes the blocked items visible
  and trackable from this repo and keeps an audit trail.
- This plan doc.

No application/legal/billing behavior changes. No secrets set. No destructive
actions. No edits outside `docs/`.

## Sub-task checklist

- [x] Confirm issue scope and cross-repo ownership (`gh issue view 410 --repo PresidentAnderson/juge.ca`).
- [x] Confirm no existing PR already addresses #410 (skip-guard).
- [x] Add canonical Operator Action Queue doc to this repo.
- [x] Add this plan doc.
- [x] Keep the verifier green (`npm run verify`).
- [ ] **[H]** Operator works the queue items in their owning repo (see decisions below).
- [ ] Keep `docs/OPERATOR_ACTION_QUEUE.md` in sync with `juge.ca#410` as items resolve.

## Human / architecture / counsel decisions required

These are the reasons #410 exists; an agent cannot make them:

1. **[H] Supabase recovery (`#103`)** — operator must run `supabase login` and
   verify dashboard settings. Keystone unblock.
2. **[H] Destructive user wipe (`#68`)** — explicit go-ahead **plus a verified
   backup** before execution.
3. **[H/counsel] Marketplace monetization & payouts (`#59`, `#60`, `#384`)** —
   business + legal decision on fee/referral model, then Stripe Connect onboarding.
4. **[H/vendor] Safety & comms vendors (`#56`, `#57`, `#61`, `#58`)** — vendor
   accounts and API keys; CSAM reporting pathway needs counsel.
5. **[H] Secret hygiene (`#492`)** — set `INGEST_OWNER_ID` in Vercel to enforce
   evidence-ingest scoping.
6. **[H] This repo's optional `RELEASE_TOKEN`** — enables hands-off release PR
   auto-merge.

## First safe slice (done)

Surface the queue as a canonical, auditable artifact in this repo and document
the operator-only decisions above — the largest correct step an autonomous agent
can take without overstepping credentials, spend, legal posture, or destructive
authority. Everything beyond this slice is operator-gated by design.
