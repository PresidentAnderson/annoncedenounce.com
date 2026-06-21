# Issue #414 — [epic] Transactional reminders: scheduled jobs, preferences, unsubscribe

**Status:** Plan (epic / human-gated). This PR carries the umbrella plan only;
`Refs #414`. No feature code is built here — that is intentional for an epic.

This document is the **coordination plan** for the reminders epic. It does not
duplicate the child plans; it stitches them into one buildable order, names the
cross-cutting decisions a human/counsel must make once, and defines the single
first safe slice.

---

## Repository-mismatch notice (read first)

This worktree is checked out against **`PresidentAnderson/annoncedenounce.com`**,
a *static marketing landing page* (`index.html`, `privacy.html`, `assets/`, a
one-file `api/version.js`, `vercel.json`). It has **no application code**: no
`lib/`, no `app/api`, no Supabase, no notifications subsystem, no Next.js.

Issue **#414 and its children live in `PresidentAnderson/juge.ca`** (the
workflow's setup step symlinks `juge.ca/node_modules` into this worktree, which
is the tell that the real codebase is juge.ca). Reminder/cron/preferences code
therefore **must not** be committed into the static landing-page repo — that
would violate the hard rule "stay in YOUR worktree / touch only files relevant
to this issue." This plan documents what to build in juge.ca so a human can
re-run the workflow against the correct repository, or apply the first slice by
hand. Every code path referenced below is a juge.ca path.

---

## Scope of the epic

Deliver **transactional reminders** end-to-end: a scheduled job computes which
reminders are due, honors per-user **preferences** and **quiet hours**, renders
**bilingual, edition-aware** copy, dispatches through the existing delivery
layer, and respects **unsubscribe / suppression** with one-click tokens. The
epic is "done" when a seeded matter deadline fires a correctly-timed,
preference-respecting, unsubscribable reminder in test mode, with reruns that do
not duplicate.

In scope (the four pillars named in the epic title plus their enablers):
- **Scheduled jobs** — the cron + rules engine that decides *what fires when*.
- **Preferences** — per-user channel × category opt-in/out, quiet hours,
  privacy-first defaults.
- **Unsubscribe** — signed one-click tokens, a suppression list, and an
  unsubscribe landing/endpoint.
- **Templates + delivery resilience** — bilingual edition-pure content and
  retry/idempotency on the send path.

Out of scope for this epic (tracked elsewhere, referenced as dependencies):
server-side matters persistence (**#461**, blocked by the **#103** Supabase
lockout), the broader jurisdiction rule-pack program (**#460**), and the mobile
push channel (**#475**).

---

## Child issues and their state (each has its own plan PR)

| Child | Title | Plan PR | Role in epic |
|------|-------|---------|--------------|
| **#428** | Scheduler + lead-time rules (Vercel Cron) | #60 | Engine: *what fires when*. Pure rules + cron shell **already built/tested** in juge.ca; only the cron **activation seam** (block "c") is unbuilt, blocked by #461/#103. |
| **#429** | User notification preferences (model + UI) | #54 | Gate: *who gets what, where*. Model + dispatcher gate + settings UI. |
| **#430** | Unsubscribe tokens + suppression list | #56 | Exit: signed one-click tokens + suppression checked on send. |
| **#431** | Bilingual edition-aware templates + delivery resilience | #58 | Content + retry/idempotency on dispatch. |
| **#460** | Jurisdiction-aware deadline & reminder rule-packs | #42 | Extends #428's lead-time rules per jurisdiction (later, larger). |
| **#475** | Mobile push as a reminder channel | #28 | Adds a channel to the same dispatcher once the mobile shell exists. |

Verified by reading juge.ca: `lib/notifications/reminders/{rules,types,dispatch,preferences,templates,from-case,unsubscribe,index}.ts`
exist with tests, and `lib/notifications/delivery/{send,outbox}.ts` is the single
delivery layer. `vercel.json` already schedules `/api/cron/notifications`
(`0 13 * * *`, Bearer `CRON_SECRET`) via `app/api/cron/notifications/route.ts`
→ `lib/notifications/cron.ts` (`runNotificationsCron`). The reminder engine is a
**pure producer** that feeds this existing outbox — the epic must **not** add a
second outbox or provider stack.

---

## Epic sub-task checklist (build order)

Order matters: data + producer first, gate + exit next, content + resilience,
then channels.

1. [ ] **#461 / #103 unblock (dependency, architecture).** Confirm or land the
       server-side `matters` / `matter_events` source so a cron can scan
       persisted deadlines. Today matters are localStorage-only on the client, so
       cron block "c" is a deliberate no-op. This is the top blocker for the whole
       epic's end-to-end acceptance.
2. [ ] **#428 activation seam.** Replace cron block "c" in
       `lib/notifications/cron.ts` to query open matters + their not-done dated
       events, run `computeReminders({ now })` → `buildReminderJobs` →
       `dispatchReminderJobs`, incrementing `summary.matterDeadlines`. Rely on the
       existing outbox dedupe on the stable `idempotencyKey`
       (`matterId:eventId:leadTime.label`) so reruns are no-ops.
3. [ ] **#429 preferences model.** Additive migration for
       `NotificationPreferences` (one row/user) with **privacy-first defaults**;
       GET/PATCH scoped to the owning user; dispatcher short-circuits opted-out,
       **non-legal** categories; settings UI with grouped, accessible toggles and
       i18n labels in every locale catalog.
4. [ ] **#430 unsubscribe + suppression.** Additive migration for a
       `suppression_list`; signed (HMAC) one-click unsubscribe tokens; an
       unsubscribe endpoint + minimal landing; dispatcher checks suppression
       before send. Reuse #429's dispatcher gate — one gate, two inputs
       (preferences + suppression).
5. [ ] **#431 templates + resilience.** Bilingual (fr/en) edition-aware templates
       through `reminders/templates.ts`; confirm `delivery/send.ts` retry +
       idempotency covers transient provider failures; edition-purity tests.
6. [ ] **#460 rule-packs.** Layer jurisdiction-specific lead-time rule-packs onto
       `EDITION_LEAD_TIMES` once the base engine is activated. Larger, later.
7. [ ] **#475 mobile push channel.** Register push as an additional channel in the
       same dispatcher/preferences taxonomy once the mobile shell (#471) exists.
8. [ ] **Epic acceptance test.** One cron-level integration test: seed a matter +
       dated event, inject `now`, assert exactly one preference-respecting,
       suppressible message on first run and **zero** new on rerun; assert a
       suppressed/opted-out user gets nothing.
9. [ ] **Migrations hygiene.** All additive-only, each taking the next free number
       at build time (sibling plans note the last on-disk was `0066_site_presence.sql`,
       so the next free was `0067_*`; re-check at build time as children may consume
       numbers). Include RLS consistent with existing matter-share policies.
10. [ ] **Type + locale gates.** `tsc --noEmit` adds no new errors in touched
        files; `npm run check:locales` passes for any new i18n keys — run both in
        **juge.ca**, not this static repo.

---

## Cross-cutting decisions required (resolve once for the epic)

These are the human / architecture / counsel gates that the children each surface
individually; deciding them once here keeps the four pillars consistent.

- **Repo ownership (architecture/human) — top blocker.** Confirm #414 and all
  children are tracked/implemented in `juge.ca`, not this static site, and
  re-run the workflow there. Nothing below can ship from this worktree.
- **Server-side matters (#461 / #103) (architecture).** The end-to-end epic is
  hard-blocked until persisted matters exist. Decide whether to unblock #103
  (Supabase) or stand up an interim persisted source.
- **Non-optional categories (legal/counsel).** Which reminder/notice categories
  are legally mandatory and therefore **cannot** be unsubscribed or opted out
  (e.g. right-of-reply, takedown decisions, account-security, statutory
  deadlines)? Unsubscribe (#430) and preferences (#429) must both exempt these.
  The Operating Canon flags right-of-reply / takedown / privacy as human-review
  areas.
- **Consent & default posture (counsel + product).** Confirm privacy-first
  defaults (marketing/digest off by default) satisfy applicable consent law, and
  whether consent timestamp/source must be recorded for auditability.
- **Unsubscribe token security (architecture).** Signing key management, token
  expiry/rotation, and that an unauthenticated unsubscribe link cannot enumerate
  or alter other users' state.
- **Provider go-live (ops).** Transactional email/SMS provider activation
  (tracked under the Resend go-live plan) and `CRON_SECRET` presence in Vercel
  are preconditions for real delivery; the engine and tests run without them in
  test mode.
- **Edition purity (product/legal).** Reminder copy must stay edition-pure
  (no cross-jurisdiction leakage); enforced by #431's edition-purity tests.

---

## First safe slice

Pick the lowest-risk, durable foundation that needs **no** legal sign-off and
**no** send-behavior change — the preferences data layer (#429), which every
other pillar gates on:

1. In **juge.ca**, add the `NotificationPreferences` model with a single
   **additive** migration (next free number at build time) and **privacy-first
   defaults only** — no dispatcher changes, no UI.
2. Add a read-only GET endpoint/server action returning the current user's prefs,
   authorized to the owning user only.
3. Add model + authorization unit tests; run `tsc --noEmit` (no new errors in
   touched files).

This lands a reviewable, reversible foundation that the dispatcher gate (#429
follow-up), unsubscribe (#430), and the cron activation (#428) all build on,
while leaving every legal/consent and send-path decision for explicitly-gated
follow-up slices.

---

## Why a plan, not code

The epic is human-gated by instruction, the real codebase is a different repo
(juge.ca) that cannot be committed from this worktree, and the end-to-end
acceptance is hard-blocked upstream (#461 / #103). Shipping the umbrella plan as
this PR gives the issue a tracked PR (`Refs #414`) and a concrete, ordered build
sequence the moment the repo-ownership and #461 blockers clear.
