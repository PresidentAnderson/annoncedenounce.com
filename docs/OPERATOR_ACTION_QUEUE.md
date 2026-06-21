# Operator Action Queue

Canonical, auditable list of work that is **blocked on the human operator** — items
that need credentials, dashboard access, a vendor account, a billing/legal decision,
or a destructive-action confirmation that an autonomous agent must not self-authorize.

Per the [Operating Canon](OPERATING_CANON.md), changes touching auth, evidence,
moderation, legal pages, privacy, right-of-reply, takedown handling, billing, or
publication rules require human/legal review. Agents prepare the work; the operator
holds the keys and the legal posture.

- **Tracking issue:** `juge.ca#410` — _Operator action queue — items blocked on you._
- **Status legend:** `[H]` needs a human/operator action · `[A]` agent-deliverable once unblocked.
- **Last reviewed:** 2026-06-21 (autonomous session).

> The line items below are cross-repo: most live in the `juge.ca` product repo
> (the reference implementation for this site's operating canon). This document is
> the **annoncedenounce.com** mirror so the operator-blocked queue is visible and
> auditable from this repo as well. Resolve the underlying work in the owning repo;
> keep this list in sync.

## How to use this queue

1. Pick the highest-priority `[H]` item.
2. Perform the operator action (log in, set the secret, approve the spend, confirm the destructive op against a verified backup).
3. Record the date and outcome on the linked issue, then check the item off here.
4. Hand the now-unblocked `[A]` follow-up back to the agent track.

## 🔴 Critical — do these first

- [ ] **`[H]` Recover Supabase access** (`juge.ca#103`) — run `supabase login`, then
  verify SMTP sender, redirect/allow-list URLs, and identity settings in the
  Supabase dashboard. This is the keystone unblock: it cascades to magic-link/auth
  reliability, transactional email, and the ability to verify every Phase-1 DB
  migration. Runbook: `juge.ca:docs/SUPABASE_RECOVERY_RUNBOOK.md`.
- [ ] **`[H]` Wipe non-real users + export real users to HubSpot** (`juge.ca#68`) —
  **DESTRUCTIVE.** Requires explicit operator go-ahead **and a verified backup first**.
  Left untouched until confirmed.

## ⚙️ Config / external accounts — each needs a key or vendor setup

- [ ] **`[H]` Provider payouts → Stripe Connect** (`juge.ca#59`) — onboarding + payout config.
- [ ] **`[H]` Attorney-marketplace monetization** (`juge.ca#60`) — business/legal decision + Stripe.
- [ ] **`[H]` Transactional email/SMS** (`juge.ca#61`) — provider account + API keys.
- [ ] **`[H]` CSAM safety workflow** (`juge.ca#57`) — hash-matching vendor + reporting pathway (legal).
- [ ] **`[H]` Upload malware scanning** (`juge.ca#56`) — scanning vendor / API key.
- [ ] **`[H]` Google Drive import** (`juge.ca#58`) — OAuth client credentials (scaffolding exists; needs the secret).
- [ ] **`[H]` Set `INGEST_OWNER_ID` in Vercel** (`juge.ca#492`) — UUID of the user whose
  matters the evidence-ingest token may write into. Until set, the token logs a warning
  and can write to any matter; once set, a mismatch returns 403.

## 💳 Gated on the above

- [ ] **`[A]` Payments for the quote-only funnel** (`juge.ca#384`) — gated on `#59`/`#60`; ships at GA.

## annoncedenounce.com — local operator actions

This static launch site has no payments, database, or evidence pipeline of its own,
so it inherits the cross-repo queue above rather than owning new blockers. The only
recurring operator action specific to **this** repo:

- [ ] **`[H]` (optional) Add `RELEASE_TOKEN` secret** — fine-grained PAT with
  `contents:write` + `pull-requests:write` so the **Auto Version Bump** release PR
  triggers CI and auto-merges on green. Without it, release PRs open but an admin
  merges them manually (GitHub's anti-recursion rule). See [`README.md`](../README.md).
- [ ] **`[H]` Confirm legal posture before any moderation/right-of-reply/takedown copy
  ships** — agents may draft; the operator/counsel approves. See [Operating Canon](OPERATING_CANON.md).

## Maintenance

Keep this file in lockstep with `juge.ca#410`. When an item is unblocked, check it
off here and note the resolution on the owning issue so the audit trail is complete.
