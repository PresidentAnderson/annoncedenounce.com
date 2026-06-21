# Plan — Issue #420: Go-live transactional email/SMS (Resend) — child of #411

> Deliverable: planning doc only. No feature code is shipped by this PR.

## Important: repository scope

Issue **#420 lives in the `PresidentAnderson/juge.ca` repository**, not in
`annoncedenounce.com` (this repo). This repo is the static launch site
(`index.html` + a tiny `/api/version` shim); it has **no Next.js app, no auth
routes, no notification adapters, and no `release-readiness.ts`**. The files the
issue names — `app/auth/confirm/route.ts`, `app/auth/callback/route.ts`,
`app/api/*`, `lib/trust/release-readiness.ts`,
`lib/notifications/delivery/providers/index.ts` — exist **only in juge.ca**.

`docs/OPERATING_CANON.md` already records that juge.ca is the reference
implementation for this site, so this PR carries the plan here (with `Refs #420`)
to give the issue a tracked PR, while the actual implementation lands in juge.ca.

## Scope

Take transactional email (and optional SMS) from "code gate present" to "live in
production" using **Resend** as the provider (selected per env). Reliable
delivery from a verified sender domain also unblocks **#103** magic-link
delivery (see `docs/SUPABASE_RECOVERY_RUNBOOK.md` in juge.ca).

Legend: **[A]** agent-delegatable · **[H]** human (credentials / vendor / DNS / legal sign-off).

## Current state in juge.ca (verified against mainline)

The adapter and the readiness gate are **already wired to env** — no code change
is needed for that sub-task:

- `lib/notifications/delivery/providers/index.ts`
  - `resendProvider()` POSTs to `https://api.resend.com/emails` with
    `Authorization: Bearer ${RESEND_API_KEY}`.
  - From address resolves via `NOTIFY_EMAIL_FROM` → `SMTP_FROM` →
    `notifications@juge.ca` fallback.
  - Provider selection: `RESEND_API_KEY` ⇒ Resend; else
    `NOTIFY_EMAIL_WEBHOOK_URL` ⇒ webhook provider.
- `lib/trust/release-readiness.ts:67-68` reports `transactionalEmail` ready when
  communications are requested **and** any of
  `RESEND_API_KEY`, `NOTIFY_EMAIL_WEBHOOK_URL`, `SMTP_HOST` is set.

So the `[A]` "confirm notify paths + release-readiness read the env" item is
**already satisfied**. What remains is mostly human/credential work plus two
small agent tasks (smoke test, bounce/complaint webhook + suppression).

## Sub-task checklist

- [ ] **[H]** Create a production **Resend** account; add and **verify the
      sender domain** (DKIM + SPF + DMARC DNS records). Decide whether SMS
      (Twilio) is in scope for go-live or deferred.
- [ ] **[A]** Set Vercel env (no secrets in repo): `RESEND_API_KEY`,
      `NOTIFY_EMAIL_FROM` (verified-domain sender), and, if used,
      `NOTIFY_EMAIL_WEBHOOK_URL`. Confirm the adapter + `release-readiness.ts`
      pick them up (both already read these keys — verify only).
- [ ] **[A]** Send a **smoke test** transactional template to a seed inbox;
      confirm deliverability (lands in inbox, not spam) and that the embedded
      link works end to end.
- [ ] **[H]** Point **Supabase Auth SMTP** at the same verified sender to fix
      **#103** magic-link reliability (per `docs/SUPABASE_RECOVERY_RUNBOOK.md`).
- [ ] **[A]** Add **bounce/complaint webhook** handling (Resend events) and a
      **suppression list** so hard bounces / spam complaints stop future sends.
- [ ] **[A]** Add **post-flip monitoring** (delivery rate, bounce rate, complaint
      rate) with an alert threshold.

## Decisions required (human / architecture / counsel)

- **[H]** Which production sender domain/subdomain and From address (affects DNS
  and brand). DKIM/SPF/DMARC alignment is a human DNS task.
- **[H]** Is SMS (Twilio) in scope for this go-live, or deferred to a follow-up?
- **[H/architecture]** Suppression-list storage: reuse an existing table/store in
  juge.ca vs. a new additive migration (must be additive-only, next free number).
- **[H/counsel]** Confirm transactional-only posture (no marketing/consent
  obligations triggered) and that bounce/complaint data handling meets the
  platform's private-data-minimization rule in `OPERATING_CANON.md`.
- **[H]** Owner of the production flag flip and the go/no-go on monitoring
  thresholds (tracked via config-flag tracker #61).

## First safe slice (in juge.ca, no human gate)

Implement **bounce/complaint webhook + suppression** behind the existing flag —
this is pure agent code, additive, and safe to merge before any credential or
DNS step:

1. Add a Resend events webhook route (e.g. `app/api/notifications/webhook/route.ts`)
   that verifies the Resend signature and records `bounced` / `complained`
   addresses into a suppression store.
2. Have the delivery path consult the suppression set before sending and
   short-circuit suppressed recipients (no behavior change until events arrive).
3. Cover it with unit tests alongside the existing
   `lib/notifications/delivery/__tests__/delivery.test.ts`.

The remaining items (Resend account, DNS verification, Vercel env, Supabase SMTP,
flag flip, smoke test against the live domain) depend on credentials/DNS and are
**[H]**-gated; they cannot be completed by an agent and are not done here.
