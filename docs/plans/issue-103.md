# Plan — Issue #103: Email / magic-link reliability + click-then-fails (Supabase auth config)

> Refs juge.ca#103. This plan lives in **annoncedenounce.com** because that is the
> repository assigned to this work item, but the *code* being audited belongs to the
> **juge.ca** reference implementation (see `docs/OPERATING_CANON.md` → Canon Sources).
> annoncedenounce.com is a static landing site with **no auth, no Supabase, and no
> magic-link flow**, so there is no in-repo code change that can resolve #103 here.
> The remaining work is **operator-credentialed Supabase dashboard configuration**,
> which no agent can perform. This doc captures the scope, the irreducible operator
> steps, and the first safe slice so the issue carries an actionable PR.

## Why this is a plan, not a code change

- **Code findings are already fixed** in juge.ca (per the issue body and its comments):
  no profiles-RLS recursion; `is_admin()` recognizes `founder_admin` (migration 0040);
  reset emails are reset-specific + logged; session/token refresh shipped (#93/#94, #101);
  migration drift 0046→0059 unstuck in build 7.27.23.
- **`supabase/config.toml` already exists** in the juge.ca repo (Site URL, six redirect
  URLs, ready-to-uncomment SMTP block; SMTP password read from `env(SUPABASE_SMTP_PASS)`).
- The **only** open items are dashboard / credentialed actions an agent cannot execute:
  custom SMTP, Auth URL allow-list, Email provider toggles, and an `auth.identities`
  identity-conflict check run from the SQL editor.

## Scope

In scope (operator actions, tracked here): Supabase Auth email reliability and the
"click-then-fails" magic-link/reset failure mode for the founder account.

Out of scope: any change to annoncedenounce.com runtime code, `lib/version.ts`,
monetization/compliance gate flags, or attestations.

## Root cause (confirmed in the issue thread)

1. **Email symptom** — the built-in Supabase email sender is rate-limited *globally per
   project/IP* (a few sends/hour, shared across magic-link + signup + reset). A brand-new
   address trips it instantly. This is the single cause of "reset email never arrives."
2. **Click-then-fails** — two contributing causes:
   - **URL allow-list:** reset/magic links route through `…/auth/callback?next=…`. If the
     link host is not in the Auth → URL Configuration redirect allow-list, the link breaks
     after the click.
   - **Identity conflict (strong suspect):** the founder uses Google + YubiKey. If the
     account exists via Google OAuth and email magic-link/password was later used on the
     same address, `auth.identities` can hold conflicting `{google,email}` identities and/or
     `email_confirmed_at` may be unset (password login requires it).

## Sub-task checklist (operator-owned, juge.ca / Supabase)

- [ ] **Custom SMTP** — Auth → Email → SMTP: configure a real provider (Resend
      `smtp.resend.com:587` recommended, or Postmark / Amazon SES). Sender
      `no-reply@judge911.com`, sender name `Juge.ca / Judge911`. Lifts the limit from a
      few/hour to thousands/day. *(This is the email-delivery fix.)* Ties to juge.ca#61.
- [ ] **Auth URL configuration** — Site URL `https://juge.ca`; Additional Redirect URLs
      must include `https://juge.ca/**`, `https://www.juge.ca/**`, `https://judge911.com/**`,
      `https://www.judge911.com/**`, `https://*.vercel.app/**`, `http://localhost:3000/**`.
      (Or apply via `supabase config push` once the CLI is authenticated.)
- [ ] **Providers → Email** — confirm Magic Link is enabled; optionally relax "Confirm
      email" for testing only, then re-enable.
- [ ] **Identity check** — in the SQL editor, run the query below for the founder address;
      confirm exactly ONE user and that `email_confirmed_at` is set; consolidate if
      `{google,email}` identities conflict.
- [ ] **Acceptance test** — request magic link / reset → email arrives (SMTP) → click →
      host is allow-listed → session established → reach onboarding/dashboard with no
      RLS/auth error; password reset sets a new password that logs in.

### Identity-check SQL (read-only)

```sql
select u.id, u.email, u.email_confirmed_at,
       array_agg(i.provider) as providers, count(i.*) as identity_count
from auth.users u
left join auth.identities i on i.user_id = u.id
where lower(u.email) = 'jonathan.mitchell.anderson@gmail.com'
group by u.id, u.email, u.email_confirmed_at;
```

Expect ONE row. Multiple users, or providers `{google,email}` causing grief → consolidate.

## Decisions required (human / architecture / counsel)

- **Operator (credentialed):** authenticate the Supabase CLI (`supabase login`) and/or use
  the dashboard. This is the irreducible gate — every item above needs the project owner's
  identity. An agent cannot log in or read/write the dashboard.
- **Architecture:** choose the SMTP provider (Resend vs Postmark vs SES) and confirm the
  sending domain (`judge911.com`) DNS (SPF/DKIM) is in place for that provider.
- **Counsel / privacy:** none new — consolidating identities touches the founder's own
  account only; no third-party PII. Follow `docs/OPERATING_CANON.md` review gate if any
  user-data migration is later required.

## First safe slice

This plan doc + PR (Refs juge.ca#103) is the safe, zero-runtime-risk first slice: it makes
the remaining operator work explicit and reviewable without touching any annoncedenounce.com
code path. The next slice — applying SMTP + the URL allow-list — is operator-only and lands
in juge.ca via `supabase config push` (config-as-code already staged there), not in this repo.
