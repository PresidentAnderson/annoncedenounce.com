# Plan — Issue #429: [reminders] User notification preferences (model + UI)

> Parent epic: #414 (reminders).
> Status of this document: **PLAN** (no feature code shipped). See "Why this is a plan, not an implementation" below.

## Why this is a plan, not an implementation

Issue #429 (`[reminders] User notification preferences (model + UI) — child of #414`)
describes an authenticated-application feature: a persisted **notification-preferences
model** plus a **settings UI** for it. That work belongs to the full `juge.ca`
application (the canonical reference implementation referenced in
`docs/OPERATING_CANON.md` and the source of this repo's `node_modules`).

This repository — `annoncedenounce.com` — is, by design, a **static launch site**:

- `package.json` declares it a static site (`serve` = `python3 -m http.server`,
  no framework, no build step).
- There is **no application substrate** to attach the feature to: no `lib/`,
  no data models, no ORM/migrations directory, no React/Vue/Next UI layer, no
  authenticated user session, and no `locales/` i18n catalogs.
- The only server surface is a single read-only probe, `api/version.js`.
- The reminders epic #414 and its acceptance criteria do not exist as tracked
  issues in this repository (the only open issue here is #1).

Adding a user-data model and a logged-in settings screen here would mean
inventing an entire auth + persistence + UI stack that the Operating Canon
deliberately does not include. That exceeds "the smallest correct change" and
would not match surrounding code. The safe, correct slice is therefore to
capture the design so the work can land in the right place.

## Scope

Deliver, in the application that actually owns the reminders epic:

1. A **NotificationPreferences model** keyed to the user, storing per-channel and
   per-event-type opt-in/opt-out, with sensible privacy-first defaults.
2. A **preferences UI** (settings panel) to read and update those preferences.
3. Wiring so the reminders/notification dispatcher (epic #414) **respects** the
   stored preferences before sending.

Out of scope for #429: building the reminder scheduler/dispatcher itself (sibling
issues under #414), transactional/legal notice categories that cannot be opted
out of, and email-provider integration.

## Sub-task checklist

- [ ] **Confirm the target codebase.** Verify whether #429/#414 should be tracked
      and implemented in `juge.ca` (or another app repo) rather than the static
      `annoncedenounce.com` site. Re-file/transfer the issue if needed.
- [ ] **Define preference taxonomy.** Channels (in-app, email, and any others)
      x event types (reminder due, status change, right-of-reply, takedown
      decision, etc.). Mark which categories are non-optional (legal/compliance).
- [ ] **Data model.** Add `NotificationPreferences` (one row per user, JSON or
      column-per-toggle). Default = privacy-first: minimal contact, only the
      legally required categories enabled by default.
- [ ] **Migration.** Additive-only, next free migration number. No backfill that
      changes existing user contactability without consent.
- [ ] **Read/write API.** Endpoints (or server actions) to GET current prefs and
      PATCH a subset; authorize to the owning user only.
- [ ] **UI.** Settings section with grouped toggles, clear labels, save/confirm,
      and accessible form semantics; non-optional categories rendered as
      disabled/explained rather than hidden.
- [ ] **i18n.** Add labels/descriptions to every locale catalog; run the locale
      checker (`npm run check:locales` in the owning repo).
- [ ] **Dispatcher gate.** Notification send path checks prefs and short-circuits
      opted-out, non-legal categories.
- [ ] **Tests.** Model defaults, authorization (cannot edit another user's prefs),
      dispatcher honoring opt-out, and migration up/down.
- [ ] **Type check.** `tsc --noEmit` adds no new errors in touched files.

## Human / architecture / counsel decisions required

- **Repo ownership (architecture/human):** Confirm #429 belongs to `juge.ca` (or
  the correct app repo), not this static site. This is the top blocker.
- **Non-optional categories (legal/counsel):** Which notification categories are
  legally mandatory and therefore *cannot* be disabled (e.g. right-of-reply,
  takedown decisions, account-security)? The Operating Canon flags
  privacy/right-of-reply/takedown as human/legal-review areas.
- **Default posture (counsel + product):** Confirm privacy-first defaults
  (opt-out of marketing/digest by default) satisfy applicable consent law.
- **Consent provenance (architecture):** Whether to record consent
  timestamp/source for auditability, consistent with the canon's auditability
  principle.

## First safe slice

Once the **repo-ownership decision** is made (issue is in the app repo that has a
user model + UI + locales):

1. Add the `NotificationPreferences` model with a single additive migration
   (next free number) and **privacy-first defaults only** — no dispatcher
   changes, no UI yet.
2. Add a read-only GET endpoint/server action returning the current user's prefs.
3. Add model + authorization unit tests.

This lands the durable, low-risk foundation (data + defaults + read path) without
touching the actual send behavior or any legal category, leaving the UI and the
dispatcher gate for follow-up slices that can be reviewed against the counsel
decisions above.
