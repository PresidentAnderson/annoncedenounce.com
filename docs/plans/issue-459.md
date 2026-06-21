# Issue #459 — [epic] A→Z: Matter↔Marketplace bridge — the professional handoff

Status: **PLAN (epic / human-gated)** — this document is the deliverable. Do not build the feature.

Refs #459.

## 0. Repository-scope note (read first)

Issue #459 does **not** exist in `PresidentAnderson/annoncedenounce.com`
(the only open issue in this repo is #1). This repository is the
**static launch site** for Annonce Denonce: plain HTML (`index.html`,
`privacy.html`), a small `/api/version` worker, and verification scripts.
It has **no** TypeScript build, **no** `lib/version.ts`, **no** SQL
migrations, and **no** i18n locale catalogs.

The "Matter↔Marketplace bridge" epic, together with every hard rule the
task references (`lib/version.ts`, monetization/compliance gate flags,
additive migrations, `npm run check:locales`, `tsc --noEmit`), targets the
**`juge.ca` application** — named in this repo's own canon as the
"reference implementation" (`docs/OPERATING_CANON.md`). The actual feature
implementation must land in the `juge.ca` repository, against issue #459
filed there.

This plan therefore does two things:

1. Records the epic scope and decomposition so the work is ready to hand to
   `juge.ca` (where the issue and the code surfaces live).
2. Captures the small, safe slice that legitimately belongs to **this**
   static site — the public-facing language and routing that introduce the
   professional handoff to a launch-stage audience.

No application code, migration, or gate flag is changed by this plan.

## 1. Scope

The Matter↔Marketplace bridge is the professional handoff: a citizen with
an open **Matter** (a moderated, evidence-backed report/case) is connected
to a vetted **professional** (lawyer / journalist / advocate) via the
**Marketplace**, end to end ("A→Z"), without leaking private evidence and
without the platform giving legal advice or taking a legal position.

In scope (juge.ca):

- A bridge entity linking a `matter` to a `marketplace_listing` / pro
  profile, with explicit, revocable, scoped consent from the matter owner.
- The handoff flow: matter owner initiates → selects pro → grants a
  scoped, time-boxed evidence view → pro accepts/declines → engagement
  opens with an audit trail.
- Disclosure controls: what slice of the matter (which documents, which
  fields) is shared, redaction defaults, and a per-share audit log.
- Notifications + status surface on both sides (matter owner, professional).
- Monetization touchpoints (referral / intro fee / subscription gate) —
  **planned only**, behind existing gate flags; this epic does not flip
  any flag (hard rule).

In scope (this static site — first safe slice only):

- Public marketing language that names the professional-handoff value prop
  and sets correct, allegation-safe, non-advice expectations.

Explicitly out of scope:

- Flipping monetization/compliance gate flags or attestations.
- Any change to `lib/version.ts`.
- Destructive/altering migrations (additive-only, next free number, in
  juge.ca).
- Building the feature in this static repo (it has no place to live here).

## 2. Sub-task checklist (juge.ca — the real implementation)

Data & schema (additive migrations only, next free number each):
- [ ] `matter_marketplace_bridge` table: `matter_id`, `listing_id` /
      `pro_id`, `status` (`requested|accepted|declined|closed`),
      `initiated_by`, timestamps.
- [ ] `bridge_disclosure_grant`: `bridge_id`, `scope` (doc ids / field
      mask), `granted_at`, `expires_at`, `revoked_at`.
- [ ] `bridge_audit_event` (append-only): who saw / shared / revoked what,
      when.

Backend / domain:
- [ ] Consent service: create, narrow, extend, revoke a disclosure grant;
      enforce expiry and revocation on every read.
- [ ] Bridge state machine + guards (no transition without a valid grant).
- [ ] Scoped evidence read path that applies the field mask / redaction
      and writes an audit event on every access.
- [ ] Monetization hook points that **read** existing gate flags; no flag
      flips (hard rule). Default = handoff free; fee path stays dark.

API / app:
- [ ] Endpoints for initiate / select-pro / grant / accept / decline /
      revoke / close, each authz-checked against matter ownership and pro
      verification.
- [ ] Status surfaces for matter owner and professional.
- [ ] i18n: add fr-CA + en-CA strings for every new user-facing string;
      `npm run check:locales` must pass.

Quality gates (juge.ca):
- [ ] `tsc --noEmit` adds no new errors in touched files.
- [ ] `npm run check:locales` passes.
- [ ] Tests for the state machine, consent expiry/revocation, and the
      redaction read path.

## 3. Sub-task checklist (this static site — first safe slice)

- [ ] Add allegation-safe marketing copy describing the professional
      handoff (Matter → vetted professional) to `index.html`.
- [ ] Ensure copy states the platform does not provide legal advice and
      does not take a position — consistent with `privacy.html` and the
      product safety principles in `docs/OPERATING_CANON.md`.
- [ ] `npm run verify` stays green (no placeholders, footer/version
      lockstep untouched).

## 4. Human / architecture / counsel decisions required

These are gating; an agent prepares the work, humans/counsel decide:

1. **Legal posture of the handoff (counsel).** Is connecting a citizen to
   a lawyer a "referral"? Does it create any duty, fee-sharing, or
   advertising-of-legal-services obligation under Quebec / Barreau du
   Québec rules? This determines whether the fee path may ever exist.
2. **Professional vetting standard (counsel + product).** Who qualifies as
   a "vetted professional", how is membership/good standing verified, and
   who is liable if a listed pro is unlicensed.
3. **Disclosure default & data minimization (architecture + counsel).**
   Default redaction posture, minimum sharable evidence set, retention of
   shared copies, and right-to-revoke mechanics under privacy law (Law 25).
4. **Monetization gate (product + finance).** Whether/when any intro/
   referral/subscription fee is permitted — this plan flips **no** gate
   flag and ships the fee path dark until that decision is made.
5. **Right-of-reply interaction (product + counsel).** How a handoff
   interacts with an identifiable party's right-of-reply on the matter.
6. **Repo routing (architecture).** Confirm the implementation lands in
   `juge.ca` (issue must be filed/linked there); this static repo carries
   only marketing copy for the value prop.

## 5. First safe slice

Smallest correct, reversible step that needs no gate flag and no schema:

> Add public-facing, allegation-safe, non-advice marketing language to the
> static launch site introducing the "professional handoff" value prop
> (citizen's Matter → vetted professional via the Marketplace), keeping
> `npm run verify` green.

This communicates the epic's intent to the launch audience without
asserting any legal position, without touching monetization/compliance
gates, and without pre-committing the architecture. Everything stateful —
the bridge entity, consent grants, audit log, redacted read path, and any
fee logic — is deferred to `juge.ca` behind the human/counsel decisions in
§4.
