# Plan — Issue #61: [config] Enable transactional email/SMS

> Deliverable: planning doc only. No feature code is shipped by this PR.
> Refs #61 (the issue lives in `PresidentAnderson/juge.ca`, not in this repo).

## Important: repository scope

Issue **#61 lives in the `PresidentAnderson/juge.ca` repository**, not in
`annoncedenounce.com` (this repo). This repo is the static launch site
(`index.html` + a tiny `/api/version` shim); it has **no Next.js app, no
notification adapters, and no `lib/trust/release-readiness.ts`**. The file the
issue names — `lib/trust/release-readiness.ts` — and the delivery
implementation (`feat/notification-delivery` branch) exist **only in juge.ca**.

`docs/OPERATING_CANON.md` records that juge.ca is the reference implementation
for this site, so this PR carries the plan here (with `Refs #61`) to give the
issue a tracked PR, while the actual flip + merge land in juge.ca.

## Scope (what #61 specifically is)

Issue #61 is the **config-flag tracker** for transactional comms. It is narrower
than the go-live epic #420 (Resend go-live plan): #61 is the focused
"flip the env flags + land the delivery branch" item.

From the issue (captured 2026-06-15):

- Status panel shows transactional email **not set up**, driven by
  `lib/trust/release-readiness.ts` (`transactionalEmail` / `transactionalSms`).
- To enable email: `TRANSACTIONAL_COMMS_LIVE=1` **plus** an email provider key.
- To enable SMS: `TRANSACTIONAL_SMS_LIVE=1` **plus** Twilio credentials.
- The delivery implementation lives on the `feat/notification-delivery` branch
  (outbox + providers), which also carries its **own committed security fixes
  pending merge**.

Legend: **[A]** agent-delegatable · **[H]** human (credentials / vendor / DNS /
merge + security review sign-off).

## Current state in juge.ca (verified against mainline)

The readiness gate is **already wired to env** — no code change is needed for the
gate itself (`lib/trust/release-readiness.ts:59,67-71`):

```ts
const communicationsRequested = envOn("TRANSACTIONAL_COMMS_LIVE");
// ...
transactionalEmail:
  communicationsRequested && hasAnyEnv(["RESEND_API_KEY", "NOTIFY_EMAIL_WEBHOOK_URL", "SMTP_HOST"]),
transactionalSms:
  envOn("TRANSACTIONAL_SMS_LIVE") &&
  Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER),
```

So the gate flips green automatically once the env vars are present **and** the
delivery branch is merged. The remaining work is a branch merge (with its
security fixes) plus human credential provisioning — not new gate code.

## Sub-task checklist

- [ ] **[H]** **Security-review + merge** `feat/notification-delivery` into
      juge.ca mainline (it carries committed security fixes pending merge).
      This is the prerequisite for any flag flip — flipping the gate before the
      delivery code is on mainline would report ready with no implementation.
- [ ] **[H]** Provision an **email provider** (Resend account, verified sender
      domain with DKIM/SPF/DMARC) — coordinated with go-live epic #420 so the
      domain/sender decision is made once.
- [ ] **[A]** Set Vercel env for juge.ca (no secrets in repo):
      `TRANSACTIONAL_COMMS_LIVE=1` and a provider key
      (`RESEND_API_KEY` or `NOTIFY_EMAIL_WEBHOOK_URL` or `SMTP_HOST`).
- [ ] **[H]** Decide whether **SMS** is in scope for this flip. If yes,
      provision Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
      `TWILIO_FROM_NUMBER`) and set `TRANSACTIONAL_SMS_LIVE=1`; otherwise leave
      SMS off and track separately.
- [ ] **[A]** After env is set + branch merged, confirm `/api/health` reports
      `transactionalEmail: true` (and `transactionalSms` per the SMS decision),
      and send a **smoke test** to a seed inbox.
- [ ] **[A]** Close #61 once the status panel shows transactional comms enabled
      in production.

## Decisions required (human / architecture / counsel)

- **[H/security]** Sign-off and merge of `feat/notification-delivery` and its
  pending security fixes — this gates everything else in #61.
- **[H]** Production sender domain/From address and DNS (DKIM/SPF/DMARC) — share
  the decision with #420 to avoid divergence.
- **[H]** Is SMS (Twilio) in scope for this flip, or deferred?
- **[H/counsel]** Confirm transactional-only posture (no marketing/consent
  obligations) and that bounce/complaint data handling meets the
  private-data-minimization rule in `OPERATING_CANON.md`.
- **[H]** Owner of the production env-flag flip and go/no-go.

## First safe slice

There is **no safe agent code slice for #61 in this repo** — the gate code
already exists in juge.ca and reads the env, the issue's only remaining levers
are (a) merging the security-bearing delivery branch and (b) provisioning
credentials + flipping env flags, both of which are **[H]**-gated.

Per HARD RULES (do not flip compliance/monetization gate flags or attestations;
touch only files relevant to this issue; work only in this worktree), no flag is
flipped and no juge.ca file is edited here. The first safe slice owned by an
agent is the **post-merge verification step**: confirm `/api/health` and run the
smoke test once a human has merged the branch and set the env vars.

## Relationship to sibling issues

- **#420** — Resend transactional email/SMS go-live plan (broader epic). #61 is
  the config-flag tracker that #420's plan references as the flag-flip owner.
- **#103** (juge.ca) — magic-link delivery reliability; unblocked once a verified
  sender domain exists, per `docs/SUPABASE_RECOVERY_RUNBOOK.md` in juge.ca.
