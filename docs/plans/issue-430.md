# Issue #430 — [reminders] Unsubscribe tokens + suppression list (child of #414)

> **Status: PLAN (blocked on repo mismatch).** This PR carries a plan only. The
> feature itself cannot be implemented in this repository — see "Why this is a
> plan, not an implementation" below.

## The issue

Part of #414. **Unsubscribe + suppression.**

- [ ] [A] Per-channel signed unsubscribe tokens + one-click unsubscribe endpoint
- [ ] [A] Suppression list honored by all sends (CAN-SPAM / CASL compliant)

**Acceptance:** unsubscribing stops that channel; suppressed addresses never receive.

## Why this is a plan, not an implementation

This worktree is the **`annoncedenounce.com`** repository — a static launch site.
Its entire surface is:

- `index.html`, `privacy.html` (static pages)
- `api/version.js`, `version.json` (version banner)
- `scripts/bump-version.mjs`, `scripts/verify-site.mjs` (site tooling)
- `package.json` with only `verify`, `version:bump`, `serve` scripts

There is **no notifications subsystem, no backend send path, no email/SMS
provider, no database, and no migrations** in this repo. The only occurrence of
"unsubscribe"/"suppression" is French prose in `privacy.html`.

Issue #430, by contrast, is filed against the **`juge.ca`** repository (verified
via `gh issue view 430` — its node_modules is what this worktree symlinks for
deps). That repo already contains the reminders/notifications stack the issue
targets:

- `lib/notifications/delivery/` — `DeliveryChannel`, `DeliveryMessage`, outbox store, providers
- `lib/notifications/reminders/` — rules, dispatch, preferences, templates
- `lib/mail/send.ts` — SMTP send path
- `supabase/migrations/` — additive, numbered SQL migrations

Implementing #430 here would mean fabricating an unrelated backend inside a
static marketing site, which violates the task's hard rules ("touch only files
relevant to this issue") and would not satisfy the acceptance criteria (there is
nothing here that "sends", so nothing to suppress). The correct home for the
work is `juge.ca`. This doc records the concrete plan so the issue has a PR and
the next agent (working in the right repo) can execute directly.

## Current state in the correct repo (`juge.ca`)

Most of part [A] (token half) is **already built** there:

- `lib/notifications/reminders/unsubscribe.ts`
  - `generateUnsubscribeToken(claims)` / `verifyUnsubscribeToken(token)` —
    HMAC-SHA256, base64url, version-prefixed canonical claims, constant-time
    compare, fail-closed verify.
  - Claims bind `(subjectId, channel, matterId)`; `matterId === ""` = account-wide,
    so an email link can't suppress SMS and a per-matter link can't suppress the account.
  - Secret from `NOTIFY_UNSUBSCRIBE_SECRET` with a deterministic non-prod test fallback.
  - `SuppressionEntry` type + pure `isSuppressed(entries, target)` helper.
- `lib/notifications/reminders/dispatch.ts` already imports `{ isSuppressed, SuppressionEntry }`
  and gates job-building on it.

So the remaining work is the **stateful + HTTP + cross-send** parts.

## Remaining sub-tasks (execute in `juge.ca`)

1. **Suppression persistence (migration).**
   Add the next free additive migration `supabase/migrations/00NN_notification_suppressions.sql`
   (check the highest existing number first; do not reuse). Table ~
   `notification_suppressions(subject_id text, channel text check in ('email','sms'),
   matter_id text not null default '', created_at timestamptz default now(),
   source text, primary key (subject_id, channel, matter_id))`. RLS: service-role
   writes only; no public select. Additive-only — no edits to prior migrations.

2. **Suppression store + reader.**
   Implement a `SuppressionStore` interface (mirror `NotificationOutboxStore` style in
   `delivery/types.ts`): `record(entry)` (idempotent upsert) and
   `listFor(subjectId)` / `isSuppressed(target)` backed by the new table, plus the
   existing in-memory impl for tests. Reuse the pure `isSuppressed` helper for the
   matching logic so behaviour is identical online and offline.

3. **One-click unsubscribe endpoint.**
   `app/api/notifications/unsubscribe/route.ts` (`export const runtime = "nodejs"`):
   - **POST** for RFC 8058 `List-Unsubscribe=One-Click` (and a GET confirmation page
     for human clicks). Read `token` from query/body, `verifyUnsubscribeToken` →
     `null` ⇒ 400 and record nothing. On success, `store.record(claims)` and return a
     localized (fr/en) confirmation. Idempotent: re-POST is a 200 no-op.
   - Add `List-Unsubscribe` + `List-Unsubscribe-Post` headers to outbound mail in
     `lib/mail/send.ts` (and the SMS opt-out footer for the sms channel), generating
     the per-channel token via `generateUnsubscribeToken`.

4. **Honor suppression on ALL sends (compliance core).**
   The acceptance bar is "suppressed addresses never receive." Audit every send
   entry point — at minimum `lib/notifications/delivery/send.ts` (the outbox→provider
   path) and `lib/notifications/reminders/dispatch.ts` — and gate each on the
   suppression store, not just the reminders engine. Centralize the check at the
   single delivery choke point (outbox enqueue or provider send) so future senders
   inherit it automatically. Marketing/transactional split: confirm with counsel
   which classes are exempt (see decisions).

5. **Tests.**
   Extend `lib/notifications/reminders/__tests__/` and add delivery-layer tests:
   token round-trip + tamper rejection (already likely covered), suppression
   honored at the choke point, one-click POST records + is idempotent, forged token
   rejected, per-channel scoping (email unsub does not stop sms).

6. **i18n.**
   Add fr/en strings for the confirmation page/email footer; run `npm run check:locales`.

## Decisions required (human / architecture / counsel)

- **Compliance scope (counsel):** CAN-SPAM/CASL distinguish commercial vs.
  transactional messages. Deadline reminders may be transactional, but confirm
  which notification templates are subject to mandatory unsubscribe and which (if
  any) are exempt, and the required retention of suppression records.
- **Secret provisioning (ops/security):** `NOTIFY_UNSUBSCRIBE_SECRET` must be set
  in every environment that sends; define rotation policy (rotating invalidates
  outstanding links — acceptable? grace window?).
- **Suppression granularity (architecture):** confirm account-wide vs.
  per-matter is the right axis, and whether suppression should also key on raw
  address (not just `subjectId`) to catch forwarded/shared inboxes.
- **DB access (process):** preferences.ts notes the operator is locked out of the
  DB (#103); confirm who applies the migration and how the store is wired in prod.

## First safe slice (in `juge.ca`)

Migration #1 + the `SuppressionStore` interface and in-memory impl (#2), with the
pure `isSuppressed` helper reused — additive, fully unit-testable, no provider or
HTTP surface, no behaviour change until the endpoint and choke-point gating land.
This is the smallest reviewable step that unblocks the endpoint and the
all-sends gating that follow.
