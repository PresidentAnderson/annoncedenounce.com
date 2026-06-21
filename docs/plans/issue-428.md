# Issue #428 — [reminders] Scheduler + lead-time rules (Vercel Cron) — child of #414

**Status:** Plan (PR carries this doc; `Refs #428`).
**Mode requested:** IMPLEMENT. **Delivered:** plan, because the change is not
implementable from this repository/worktree (see "Why a plan, not code").

---

## Repository-mismatch notice (read first)

This worktree is checked out against **`PresidentAnderson/annoncedenounce.com`**,
which is a *static marketing landing page* (`index.html`, `privacy.html`,
`assets/`, a one-file `api/version.js`, `vercel.json`). It has **no application
code**: no `lib/`, no `app/api`, no Supabase, no notifications subsystem, and no
Next.js.

Issue **#428 lives in `PresidentAnderson/juge.ca`** (label `area:notifications`,
parent epic **#414**). The setup step itself symlinks
`juge.ca/node_modules` into this worktree, which is the tell that the issue's
codebase is juge.ca, not annoncedenounce.com.

Consequently the real change **cannot be committed from this worktree** without
violating the hard rule "stay in YOUR worktree only / touch only files relevant
to this issue." Pushing reminder/cron code into a static landing-page repo would
be wrong on its face. This plan documents exactly what to do in juge.ca so a
human can re-run the workflow against the correct repository (or apply the slice
described under "First safe slice").

---

## Current state in juge.ca (verified by reading the code)

Most of #428 is **already built** in juge.ca. The pure rules engine and the cron
shell exist and are tested:

- `lib/notifications/reminders/rules.ts` — header literally says
  *"Reminder rules engine (#428)"*. Provides:
  - `DEFAULT_LEAD_TIMES` per event type
    (`deadline` → T-7/T-2/T-0, `hearing` → T-7/T-1, `appointment` → T-1).
  - `EDITION_LEAD_TIMES` edition/jurisdiction-aware overrides (e.g. `us`
    deadlines add T-14) via `leadTimesFor(edition, type)`.
  - `computeReminders`, `computeFireAt` — **timezone-correct** fire instants
    (DST-safe via a two-pass `Intl.DateTimeFormat` offset resolution; no extra
    deps), and **stable idempotency keys**
    (`reminderIdempotencyKey = matterId:eventId:leadTime.label`).
- `lib/notifications/reminders/{types,dispatch,preferences,templates,from-case,unsubscribe,index}.ts`
  — job building, preference/quiet-hours/suppression gating, edition-pure copy,
  case→matter normalization. The engine is a pure producer that feeds the
  **existing** delivery layer (`lib/notifications/delivery/{send,outbox}.ts`);
  it adds **no** second outbox and **no** second provider stack.
- Tests already cover the acceptance criteria's logic half:
  `lib/notifications/reminders/__tests__/{reminders.test.ts,reminders-lifecycle.test.ts,edition-purity.test.ts}`.
- `vercel.json` already schedules `/api/cron/notifications` (`0 13 * * *`),
  authenticated by `CRON_SECRET` (Bearer), implemented by
  `app/api/cron/notifications/route.ts` → `lib/notifications/cron.ts`
  (`runNotificationsCron`). That cron already does (a) a failed-outbox **retry
  sweep** and (b) **order reminders**, both idempotent.

### The one remaining gap = the activation seam

`lib/notifications/cron.ts` block **(c) "Matter-deadline reminders — SCAFFOLD
ONLY"** is a deliberate no-op (`summary.matterDeadlines = 0`). Its own comment
states it is the spot where
`computeReminders → buildReminderJobs → dispatchReminderJobs` would run, and that
it is **deferred** because user matters are still **localStorage-only on the
client (#461 server-side matters)**, which is blocked by the **#103 Supabase
lockout**. A server-side cron cannot read a browser's `localStorage`, so there is
nothing to scan yet — the no-op is correct, not an oversight.

**Net:** #428's pure scheduler + lead-time *rules* are done and tested; the only
unfinished work is **activating** them in the cron, which is hard-blocked
upstream.

---

## Scope of #428

- [A] Idempotent, timezone-correct cron job — **done** in `rules.ts`
  (`computeFireAt`, idempotency keys) + `cron.ts` (Bearer-auth, batch caps,
  per-day buckets, never-throws summary).
- [A] Lead-time rules per event type, edition/jurisdiction-aware — **done** in
  `rules.ts` (`DEFAULT_LEAD_TIMES`, `EDITION_LEAD_TIMES`, `leadTimesFor`).
- **Remaining:** wire the engine into cron block (c) over a real server-side
  matters source, so a *persisted* seeded deadline fires through the live
  delivery layer and reruns don't duplicate.

**Acceptance:** "a seeded deadline fires a correctly-timed reminder in test
mode; reruns don't duplicate." The *logic* acceptance is already met by the
engine + unit tests (test mode = injected `now` + memory outbox/preferences
stores). The *end-to-end* acceptance (real cron → real matter row → real outbox)
needs the activation below.

---

## Sub-task checklist (for the juge.ca implementation)

1. [ ] **Confirm/define the server-side matters source.** Depends on **#461**.
       Need a `matters` table (id, edition, locale, timezone, name, owner) and a
       `matter_events` table (id, matter_id, type ∈ deadline|hearing|appointment,
       title, due_date, done, consequence?, source_citation?) — these map 1:1 to
       `ReminderMatter` / `ReminderEvent` in `reminders/types.ts`.
2. [ ] **Additive migration** for those tables IF #461 hasn't already added them.
       Next free number is **`0067_*.sql`** (last on disk is `0066_site_presence.sql`).
       Additive-only; include RLS consistent with existing matter-share policies.
3. [ ] **Replace cron block (c)** in `lib/notifications/cron.ts`:
       query open matters + their not-done dated events (batch-capped like the
       existing sweeps), `reminderMatterFromCase`/build a `ReminderMatter`, run
       `computeReminders({ now })`, `buildReminderJobs` (honoring
       preferences/quiet-hours/suppression), then `dispatchReminderJobs` via
       `sendNotification`. Increment `summary.matterDeadlines` (already wired).
4. [ ] **Idempotency end-to-end:** rely on the existing outbox dedupe on
       `idempotencyKey` (already stable per matter/event/lead-time) so a rerun on
       the same day is a no-op — assert this in a new cron-level test.
5. [ ] **Timezone correctness end-to-end:** seed an event across a DST boundary
       and assert `fireAt` lands on the intended local wall-clock instant
       (engine already handles this; add a cron-path test).
6. [ ] **Tests:** extend `__tests__` with a cron-activation test (injected admin
       mock returning a seeded matter+event, injected `now`, memory stores);
       assert exactly one message on first run and zero new on rerun.
7. [ ] **Docs/ops:** confirm `CRON_SECRET` is set in Vercel; note the daily
       schedule already exists in `vercel.json` (no new cron entry needed unless
       a different cadence is wanted for matter reminders).
8. [ ] Run `node_modules/.bin/tsc --noEmit` (no new errors in touched files) and
       `npm run check:locales` (reminder templates are bilingual fr/en).

## Out of scope (other #414 children)

Channel/provider work, preferences UI, unsubscribe UX — covered by sibling
issues #429–#432; this issue is the **scheduler + rules** only.

---

## Decisions required (human / architecture / counsel)

- **Architecture (blocking):** land **#461 server-side matters** (and unblock
  **#103 Supabase lockout**) so the cron has something to scan. Until then the
  scaffold no-op must stay; do not invent a server-side store ad hoc.
- **Product:** confirm the default lead-time ladder per event type and the daily
  fire hour (`DEFAULT_REMINDER_HOUR`) are the desired policy; decide whether
  matter reminders share the existing `0 13 * * *` cron or want their own cadence.
- **Counsel / compliance:** the edition-specific lead times in `EDITION_LEAD_TIMES`
  (e.g. US T-14) are *scheduling heuristics*, not legal advice. Any
  jurisdiction-specific value beyond the safe default should be reviewed so the
  copy stays edition-pure (the `edition-purity` test guards this; keep it green).
  Do **not** flip any monetization/compliance gate flags or attestations as part
  of this work.

---

## First safe slice (smallest correct step, no upstream unblock needed)

Because end-to-end activation is hard-blocked by #461/#103, the smallest correct
*shippable* slice that adds value **without** server-side matters is a
**cron-level activation test against an injected matters source**, proving the
wiring is correct the moment a real source exists:

1. In juge.ca, add `CronDeps.matters?` — an optional injected provider returning
   `ReminderMatter[]` (default `() => []`, i.e. current behavior unchanged in
   production until #461). This is additive and keeps the production no-op intact.
2. In block (c), if `deps.matters` yields rows, run
   `computeReminders → buildReminderJobs → dispatchReminderJobs` and count them;
   otherwise leave `matterDeadlines = 0` exactly as today.
3. Add `__tests__/reminders-cron-activation.test.ts`: inject one seeded
   `ReminderMatter` with a deadline + a fixed `now`, memory outbox/preferences;
   assert one dispatched message on run 1 and zero new on run 2 (idempotent), and
   that `fireAt` is timezone-correct. This satisfies the #428 acceptance *in test
   mode* with zero production risk and no schema change.
4. When #461 lands, the only remaining edit is to default `deps.matters` to a
   real Supabase query — the test already pins the contract.

This slice is intentionally **not** committed here because it must live in
juge.ca, not in this annoncedenounce.com worktree. Re-run this workflow against
`PresidentAnderson/juge.ca` to apply it.
