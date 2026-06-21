# Plan — Issue #475: [mobile] Push notifications — deadline/appointment reminders

> Mode: **PLAN** (epic, human-gated). This document is the deliverable. Do **not**
> build the feature from this branch. The implementation lives in the
> `juge.ca` application repo; this plan is grounded in that codebase's existing
> `#414` reminder rails.

## 1. Scope

**Goal:** deliver the `#414` reminder system to mobile devices via native push
(APNs on iOS, FCM on Android), edition-aware and bilingual (fr/en).

**Push is a new _channel_ on the existing `#414` rails — not a new system.** The
reminder engine, preferences, quiet hours, unsubscribe/suppression and the
outbox already exist and must be **reused**, not rebuilt (`#428`–`#432`).

### What already exists (reuse, do not duplicate)
Verified in `juge.ca` at `lib/notifications/`:

- **Channel union** — `lib/notifications/delivery/types.ts`:
  `type DeliveryChannel = "email" | "sms"`. Push is added here as a third member.
- **Provider selection** — `lib/notifications/delivery/providers/index.ts`:
  `selectDeliveryProvider(channel)` returns a `DeliveryProvider` per channel,
  with an env-gated cascade and a `skipped("…")` no-op fallback when
  unconfigured. The push provider follows this exact pattern.
- **Outbox** — `lib/notifications/delivery/{types,outbox,send}.ts`:
  `NotificationOutboxRow` / `NotificationOutboxStore`, idempotency keyed on
  `idempotencyKey`, `markSent` / `markFailed`, retry via `next_attempt_at`. The
  push channel writes to the **same** outbox; no second outbox.
- **Reminder engine → jobs** — `lib/notifications/reminders/dispatch.ts`:
  `buildReminderJobs()` iterates `prefs.channels`, gating on `channelEnabled`,
  `isSuppressed`, and `decideDelivery` (quiet hours). `toDeliveryMessage()`
  builds the `DeliveryMessage` with `idempotencyKey:
  ${reminder.idempotencyKey}:${channel}`. Adding `"push"` to a subject's
  `channels` is what turns push on — **the engine already loops every channel.**
- **Preferences + quiet hours** — `lib/notifications/reminders/preferences.ts`:
  `ReminderPreferences.channels: DeliveryChannel[]`, `frequency`, `quietHours`,
  `decideDelivery()`, plus the `ReminderPreferencesStore` interface and an
  in-memory store. Push inherits all of this for free once `"push"` is a valid
  channel and a device address can be resolved.
- **Templates** — `lib/notifications/delivery/templates.ts` (the
  `deadline-reminder` template) and `lib/notifications/reminders/templates.ts`
  (`buildReminderPayload`). Bilingual + edition-aware copy reuses these and
  `dictionaries/{fr,en}.ts`.
- **Edition purity** — enforced today by tests
  (`reminders/__tests__/edition-purity.test.ts`). Push templates must keep it.

### What does NOT exist yet (the real work)
- **No mobile shell.** There is no Capacitor/Expo/React-Native config in
  `juge.ca` (no `capacitor.config.*`, no `ios/` or `android/`). A mobile runtime
  decision is a prerequisite (see §3).
- No device-token storage, no APNs/FCM credentials, no push provider, no
  deep-link route handling for a push tap.

## 2. Sub-task checklist

Each maps to a child in the issue. `[A]` = agent-buildable once decisions land;
`[H]` = human/credential-gated.

- [ ] **[H] Mobile runtime decision** — pick the device shell (see §3). Blocks
      everything device-side. The token-registration API and the push
      provider/outbox plumbing (below) are shell-agnostic and can land first.
- [ ] **[H] APNs credentials** — Apple Push key (`.p8`), Key ID, Team ID, bundle
      id. Stored as secrets (`APNS_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID`,
      `APNS_BUNDLE_ID`). Never committed.
- [ ] **[H] FCM credentials** — Firebase project + service account / server key
      (`FCM_PROJECT_ID`, `FCM_SERVICE_ACCOUNT_JSON`). Never committed.
- [ ] **[A] Device-token storage (server-side, as a `#414` channel)** — additive
      migration `0067_push_device_tokens.sql` (next free number; current head is
      `0066_site_presence.sql`). Table `push_device_tokens`:
      `id, user_id (Supabase auth uid, RLS owner-scoped), platform ('ios'|'android'),
      token, edition, locale, created_at, last_seen_at, revoked_at`.
      Mirror as a `PushDeviceTokenStore` **interface** first (matching the
      `ReminderPreferencesStore` pattern) so it is unit-testable before DB
      access lands (operator DB lockout — `#103`).
- [ ] **[A] Token-registration API** — authenticated route (under `app/api/…`)
      that upserts `(user_id, platform, token)` for the signed-in Supabase user;
      idempotent; soft-revokes on logout/unregister.
- [ ] **[A] Add `"push"` to `DeliveryChannel`** in
      `lib/notifications/delivery/types.ts`, then resolve the resulting
      exhaustiveness gaps (provider selection, address resolution).
- [ ] **[A] Push address resolution** — in `reminders/dispatch.ts`,
      `addressFor()` currently returns `prefs.email` / `prefs.phone`. For push,
      the "address" is the set of the subject's active device tokens, resolved
      via the `PushDeviceTokenStore`. Decide: one outbox row per device vs. one
      row per subject with a token fan-out at send time (recommend fan-out at the
      provider boundary, keyed for idempotency per token).
- [ ] **[A] Push provider** — `lib/notifications/delivery/providers/push.ts`
      implementing `DeliveryProvider` (`channel: "push"`), env-gated like the
      others, returning `skipped("push")` when unconfigured. APNs (HTTP/2 + JWT
      from the `.p8`) and FCM (HTTP v1) behind one provider that routes by the
      token's `platform`.
- [ ] **[A] Map `#414` rules → push payload** — lead times, quiet hours,
      timezone, edition, locale already flow through `buildReminderJobs`. Add a
      `buildPushPayload()` (alongside `buildReminderPayload`) producing
      `{ title, body, data: { matterId, eventId, deepLink } }`, bilingual via
      `dictionaries/*`, honoring preferences + unsubscribe on the push channel.
- [ ] **[A] Bilingual + edition-aware templates** — no cross-jurisdiction leak;
      extend `reminders/__tests__/edition-purity.test.ts` to cover push copy.
- [ ] **[A] Deep-link from a push tap** — `data.deepLink` →
      matter/deadline screen; define the route scheme once the shell is chosen.
- [ ] **[A] Delivery logging + invalid-token cleanup** — feed results into the
      existing outbox (`markSent`/`markFailed`); on APNs `410` / FCM
      `UNREGISTERED`, soft-revoke the token (`revoked_at`) so dead tokens stop
      being targeted.
- [ ] **[A] Tests** — provider unit tests with APNs/FCM mocked; dispatch tests
      asserting `"push"` jobs are built/gated identically to email/sms; edition
      purity; idempotency across re-runs.

## 3. Human / architecture / counsel decisions required

1. **Mobile runtime (architecture, blocking):** Capacitor (wrap the existing
   Next.js app + `@capacitor/push-notifications`) vs. a dedicated Expo/RN client
   vs. web-push only. Recommendation for smallest correct first step: Capacitor,
   because it reuses the existing web app and the deep-link routes already exist
   as web routes. This is a one-time decision with large downstream cost.
2. **Credentials (human, blocking the device path):** Apple Developer account +
   APNs `.p8`; Firebase project + FCM service account. Owner-provisioned secrets.
3. **Token model (architecture):** one outbox row per device vs. per subject with
   provider-side fan-out (recommend fan-out; keep one idempotency key per token).
4. **Privacy / counsel:** push notification _content_ on a lock screen can leak
   matter details. Decide the lock-screen copy policy (e.g. generic
   "You have a deadline reminder" with details only after auth) — a
   compliance/counsel call, edition-aware, no cross-jurisdiction leak.
5. **Consent / opt-in:** OS push permission + the app-level opt-in must map onto
   the existing `ReminderPreferences` + unsubscribe so opting out of push is a
   first-class, honored suppression on the push channel.

## 4. First safe slice (no device, no credentials, fully reviewable)

The smallest correct change that moves the issue forward **without** any human
gate, all in `juge.ca`, additive and behind the existing skip/no-op patterns:

1. Add `"push"` to `DeliveryChannel` in
   `lib/notifications/delivery/types.ts` and fix the exhaustiveness fallout.
2. Add a `skipped("push")` branch to `selectDeliveryProvider` so an unconfigured
   push channel is a safe no-op (identical to today's unconfigured email/sms).
3. Define the `PushDeviceTokenStore` interface + an in-memory implementation
   (mirroring `ReminderPreferencesStore` / `createMemoryPreferencesStore`).
4. Teach `reminders/dispatch.ts` to resolve a push "address" via the store and
   build push jobs through the unchanged `buildReminderJobs` loop; when no active
   token exists, skip with reason `"no-address"` (reusing the existing ledger).
5. Add `buildPushPayload()` with bilingual/edition-aware copy and a unit test +
   an edition-purity assertion.

This slice ships **no behavior change in production** (push stays a no-op until a
provider and tokens are configured), adds full test coverage of the channel
wiring, and leaves only credential-gated and shell-gated work for the
human-in-the-loop steps. The additive migration `0067_push_device_tokens.sql`
can accompany this slice or follow once DB access (`#103`) is available.

## 5. Hard-rule compliance for the eventual implementation
- `lib/version.ts` — untouched.
- No monetization/compliance gate flags or attestations flipped.
- Migrations additive-only; next free number `0067` (head: `0066_site_presence.sql`).
- Touch only notification/push-relevant files.
- Run `node_modules/.bin/tsc --noEmit` and `npm run check:locales` before each PR.

Refs #475. Cross-links: #414, #428–#432, #496, #103.
