# Issue #431 — [reminders] Bilingual edition-aware templates + delivery resilience

Child of epic **#414** (order-notification / reminder engine). Acceptance:
reminders render correctly per locale/edition; transient failures retry; bounces
logged.

> **This PR carries a plan only (Refs #431), not the implementation.**

## Why a plan and not code

The work for #431 lives in the **`juge.ca`** application repository
(`github.com/PresidentAnderson/juge.ca`), under `lib/notifications/`. This
worktree is checked out against **`annoncedenounce.com`**
(`github.com/PresidentAnderson/annoncedenounce.com`), which is a 25-file static
marketing site (`index.html`, `privacy.html`, version-bump scripts) with **no
reminders, notifications, i18n, editions, or migration code**.

The task's hard rules require staying inside this worktree and touching only
files relevant to the issue. The relevant files are not present in this repo and
cannot be reached from this worktree without leaving it. Per the fallback
("if genuinely blocked on a real implementation, STILL open a PR carrying a plan
doc so the issue has a PR"), the deliverable here is this grounded plan, written
against the real `juge.ca` codebase so whoever picks it up there can implement
the smallest correct slice.

**Action for a maintainer:** re-run the implement workflow with a worktree of
`juge.ca`, or land the slices below directly there.

## What already exists in `juge.ca` (verified)

The reminder engine and delivery rails are largely built. Relevant modules:

- `lib/notifications/reminders/`
  - `types.ts` — `ReminderEvent`, `ReminderMatter`, `DueReminder`,
    `ReminderJob`, `ReminderPreferences`, `QuietHours`.
  - `templates.ts` — **bilingual (fr/en) + edition-aware** next-step copy.
    `NEXT_STEP_BY_TYPE` (edition-neutral) + `NEXT_STEP_BY_EDITION` (per-edition,
    e.g. `qc`/`us`), resolved by `reminderNextStep(edition, type, locale)`.
    `buildReminderPayload()` feeds the existing `deadline-reminder` delivery
    template. Edition-purity is the stated invariant (keys only on the matter's
    OWN edition; unknown edition → neutral copy).
  - `dispatch.ts` — `toDeliveryMessage` / `buildReminderJobs`: maps due reminders
    to `DeliveryMessage`s, honors channels / `frequency=off` / quiet hours /
    suppression; returns `jobs` + a `skipped` ledger. Pure; does not send.
  - `preferences.ts`, `unsubscribe.ts`, `rules.ts`, `from-case.ts`, `index.ts`.
  - `__tests__/edition-purity.test.ts`, `reminders.test.ts`,
    `reminders-lifecycle.test.ts`.
- `lib/notifications/delivery/`
  - `outbox.ts` — `notification_outbox` with `status`, `attempts`, `last_error`,
    `next_attempt_at`, `provider`, `provider_message_id`; memory + Supabase
    stores; `enqueue` (idempotent on `idempotency_key`, 23505 → duplicate),
    `markSent`, `markFailed(nextAttemptAt)`.
  - `send.ts` — `sendNotification` (enqueue → provider → mark), `retryNotification`
    (replays a failed row through the SAME provider+template, no new row),
    `nextRetryAt(attempts)` backoff + attempt cap.
  - `types.ts` — `DeliveryStatus`, `DeliveryMessage`, `DeliveryResult`,
    `NotificationOutboxRow`, `NotificationLocale` (fr/en).
- `lib/notifications/cron.ts` — `runNotificationsCron`: **(a) retry sweep**
  (`status=failed`, `next_attempt_at <= now`, under cap → `retryNotification`),
  **(b)** order/reminder dispatch. Exposed via
  `app/api/cron/notifications/route.ts` (Bearer `CRON_SECRET`, daily).

So **bilingual + edition-aware templates** and **logging + retry** already exist.

## Gap analysis vs. #431 acceptance

| Acceptance criterion | Status in `juge.ca` | Remaining work |
| --- | --- | --- |
| Reminders render correctly per locale/edition, no cross-jurisdiction leak | Built (`templates.ts` + `edition-purity.test.ts`) | Confirm coverage for every reminder `eventType` and for `frequency=daily-digest`; add a render snapshot per supported locale. |
| Delivery logging | Built (`notification_outbox` columns + `last_error`) | Ensure reminder jobs flow through `enqueue` (audit row per `(matterId,eventId,leadTime,channel)`). |
| Transient failures retry | Built (`retryNotification`, `nextRetryAt`, cron retry sweep) | Verify attempt cap shelves to a terminal state instead of looping; add `dead_letter`/`abandoned` status if missing. |
| Bounces logged + handled | **Missing** | Classify hard bounce / complaint from `DeliveryResult`; stop retrying that address; record a suppression so future reminders skip it; log the bounce. |

## Sub-task checklist (in `juge.ca`, smallest-slice ordered)

- [ ] **Slice 1 — Bounce classification (no schema change).**
      Add a `kind: "transient" | "bounce" | "complaint"` (or reuse an existing
      error taxonomy) to `DeliveryResult` in `lib/notifications/delivery/types.ts`.
      In `send.ts`/`retryNotification`, when a provider reports a hard
      bounce/complaint, mark the row terminal (no `next_attempt_at`) instead of
      scheduling a retry. Pure, unit-testable with a mocked provider.
- [ ] **Slice 2 — Suppress bounced addresses.**
      On a hard bounce/complaint, write a `SuppressionEntry`
      (`lib/notifications/reminders/unsubscribe.ts`) for that
      `(subjectId|address, channel)` so `buildReminderJobs` already skips it
      (`reason: "suppressed"`). Reuse the existing suppression path — do not add a
      second mechanism.
- [ ] **Slice 3 — Wire reminder jobs into the outbox + cron.**
      In `cron.ts`, after building reminder jobs, `enqueue` each due job's
      `message` (idempotency key already per-channel) so it logs + retries on the
      existing rails. Confirm the cron summary counts reminders sent/skipped.
- [ ] **Slice 4 — Template coverage hardening.**
      Extend `templates.test.ts` to assert fr + en render for each `eventType`
      and each edition that overrides copy, and re-assert edition purity
      (a `qc` matter never renders `us` wording and vice-versa). Cover
      `daily-digest` aggregation copy if that path renders text.
- [ ] **Slice 5 — Additive migration only if a new column is required.**
      Only if bounce handling needs persistence beyond `last_error`/`status`
      (e.g. a `notification_suppressions` table or a `bounced` status), add the
      **next free** migration number in `supabase/migrations/` — current max is
      `0066_site_presence.sql`, so the next is **`0067_*.sql`**, additive-only.
      Prefer reusing existing columns/tables to avoid a migration entirely.

## First safe slice

**Slice 1 (bounce classification).** It is pure, fully unit-testable with the
provider mocked, needs no migration, and directly closes the one missing
acceptance criterion ("bounces logged + handled") without touching the static
site or any compliance/monetization gate. It also unblocks Slice 2 (suppression)
and Slice 3 (cron wiring).

## Human / architecture / counsel decisions required

- **Bounce taxonomy & provider mapping (architecture):** which provider
  signals count as a hard bounce vs. complaint vs. transient, per provider in
  `lib/notifications/delivery/providers/`. Wrong classification either spams a
  dead address or silently drops a valid recipient.
- **Suppression scope & reversal (product + counsel):** is a bounce-driven
  suppression global to the address or scoped per matter/channel, and how is it
  reversed (user re-confirms)? Touches consent/communication records.
- **Edition-purity sign-off (counsel / standing directive):** any new
  edition-specific reminder copy must be reviewed so it never names another
  edition's jurisdiction, court, or authority, and is not legal advice.
- **Migration go/no-go (architecture):** approve `0067_*` only if Slices 1–3
  cannot be satisfied with existing columns.

## Hard-rule guardrails for the implementer

- Never edit `lib/version.ts`.
- Never flip monetization/compliance gate flags or attestations.
- Migrations additive-only; next free number is `0067` (in both
  `supabase/migrations/` and the mirrored `db/`-equivalent if present).
- Touch only `lib/notifications/**` (+ its tests) and, if unavoidable, one new
  additive migration. Do not touch unrelated app areas.
- After changes: `node_modules/.bin/tsc --noEmit` adds no new errors in touched
  files; `npm run check:locales` passes for any i18n string changes.
