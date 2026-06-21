# Plan — Issue #464: [epic] Rich — Real-time multi-party matters & scoped portals

> **Mode:** PLAN (epic / human-gated). This document is the deliverable. It does **not**
> build any feature. It scopes the epic, breaks it into concrete sub-tasks, flags the
> human / architecture / counsel decisions required, and names the first safe slice.

## Repository context (important)

Issue #464 is tracked in the **`PresidentAnderson/juge.ca`** application repository (the
justice-platform product) and is child epic #2 of the meta-epic #470. This repository —
`annoncedenounce.com` — is the **static launch site and operating-workflow home**. Per
`docs/OPERATING_CANON.md` it follows the same operating shape as the stronger sovereign
repos, "scaled down for a static launch site," and cites `juge.ca` as the reference
implementation.

Because the platform code (`lib/`, the RLS migrations, Supabase Realtime, `matter_shares`,
the copilot, the workspace surfaces, etc.) lives in `juge.ca`, the **implementation work for
#464 happens there**. This plan is committed here as the planning-of-record so the epic
carries a reviewed plan and a PR (Refs #464), consistent with the Sovereign Autonomy rule in
`docs/OPERATING_CANON.md` that agents "prepare the work; they do not decide the legal
posture." #464 carries the `area:security`, `area:workspaces`, `epic`, and `priority:high`
labels — it touches auth/access enforcement, so it is squarely inside the human/legal review
gate.

The application-build gates named in the task brief (`tsc --noEmit`, `npm run check:locales`)
do not exist in this static-site repo; the applicable local gate here is `npm run verify`,
which was run for this change. The TypeScript and locale gates **must** be applied in
`juge.ca` when each child task is implemented.

## Source of truth

- Parent meta-epic plan: `docs/plans/issue-470.md` (this repo) — #464 is its child #2 and its
  named **first safe slice**.
- Strategic synthesis: `juge.ca:docs/BEYOND_MVP_ROADMAP.md` (this epic = roadmap section 2).
- Governing book where specs conflict:
  `GLOBAL_JUSTICE_OPERATING_SYSTEM_ENGINEERING_BOOK.md`.
- Existing primitives this epic **consumes / extends** (do not reinvent):
  - `matter_shares` table + share scopes (the thing being extended).
  - #154 — the ownership≠access "wall" (absolute precondition).
  - #131 — break-glass, quorum-gated.
  - #129 — the audit trail.
  - `board.ts` Supabase Realtime (generalize, don't fork).

## Scope

**What:** let co-counsel, client, expert, **and a restricted opposing-party portal**
collaborate on **one matter** in real time with **cryptographic, document-level scoping** —
turn the "projection policies" the UI already promises into something the **database
actually enforces**.

**Why:** today the inbox / UI filters which documents a non-owner sees, but the database does
not. A share with `scope='subset'` is honoured by the application layer only; a direct query
can still return non-shared rows. That is a **latent security leak** (separately filed as
#469) and it violates the existing ownership≠access wall (#154). Nothing else in this epic is
safe to build until the DB is the enforcement layer.

**Guardrails (non-negotiable, enforced in code not copy):**

- **ownership ≠ access is absolute** (#154) — being the matter owner does not by itself grant
  a counterparty access, and a share never silently widens scope.
- **document-level scope enforced in RLS, not just the inbox** — a non-shared document must
  return **0 rows at the DB layer**, independent of UI filtering.
- **least-privilege RBAC** — each role gets the minimum capability; defaults deny.
- **break-glass is quorum-gated** (#131) — emergency access is never single-actor.
- **every share / presence / access event is audited** (#129) — no silent reads or grants.
- **contact-guard stays on in cross-party channels** — opposing parties cannot harvest
  contact details through the shared surface.
- **closed matters freeze their trail** — a closed matter is read-only and its audit trail is
  immutable.

**In scope:** RLS subset enforcement; scoped roles (co-counsel / client / expert /
opposing-party); Realtime presence + live comments with polling fallback; conflict-of-interest
pre-grant check (suggest-only); opposing-party read-only served-documents portal; optimistic
edit + audited server reconciliation.

**Out of scope for #464:** the AI agent roster (#463); trust/escrow/e-sign (#465); analytics
(#466); community/academy (#467); accessibility/i18n breadth (#468). The opposing-party
portal explicitly **has no copilot** and is **read-only**.

## Sub-task checklist

Mirrors the `[A]` (agent-delegatable) / `[H]` (human/counsel) split on the GitHub issue,
re-ordered into a safe build sequence. Each `[A]` item lands as its own PR in `juge.ca`
referencing #464 (and #469 for the first), with `tsc --noEmit` clean on touched files and
`check:locales` run when any user-facing string changes.

### Slice 0 — close the DB leak (also security fix #469) — **do this first**
- [ ] [A] Additive, **next-free-numbered** migration adding an RLS policy on the document
  child tables so a `scope='subset'` share in `matter_shares` filters `SELECT` to the shared
  document IDs only; a non-shared document → **0 rows at the DB layer**.
- [ ] [A] Negative tests: a `subset` recipient querying a non-shared doc gets zero rows; the
  owner still sees everything; a `scope='full'` share is unaffected; a closed matter is
  read-only.
- [ ] [A] Confirm the policy composes with the #154 wall (no policy ORs around it) and that an
  `INSERT/UPDATE/DELETE` from a `subset` recipient on a non-shared doc is denied, not just
  `SELECT`.

### Slice 1 — scoped roles (RBAC on top of the enforced scope)
- [ ] [A] Role model: **co-counsel** (edit drafts), **client** (comment + upload),
  **expert** (scoped read/annotate), **opposing-party** (scoped-read of *served* docs only).
- [ ] [A] Capability matrix expressed in RLS / DB roles (defaults deny); each capability has a
  **negative test per denial** (e.g. client cannot edit a draft; expert cannot upload to a
  served-docs-only matter; opposing-party cannot see un-served drafts).

### Slice 2 — real-time collaboration
- [ ] [A] Generalize the `board.ts` Realtime channel into a matter-scoped presence + live
  comment channel (subscribed only to documents the caller's scope permits).
- [ ] [A] **Polling fallback** when Realtime is unavailable, with identical authorization.
- [ ] [A] Every presence join/leave and comment event is **audited** (#129).

### Slice 3 — safe concurrent editing
- [ ] [A] Optimistic local edit + **server reconciliation**; conflicts are resolved with an
  **audited** decision and **never silent data loss**.

### Slice 4 — conflict-of-interest gate (suggest-only)
- [ ] [A] Before a co-counsel / expert grant, run a conflict-of-interest check that
  **suggests** and **requires human confirmation** — it never auto-grants.

### Slice 5 — opposing-party portal
- [ ] [A] Read-only view of **only formally-served** documents; its **own disclaimer**; **no
  copilot**; contact-guard enforced.
- [ ] [H] **Counsel review** of the opposing-party disclosure language + **service-of-process
  implications per jurisdiction** before the portal is enabled in any `live` edition.

## Human / architecture / counsel decisions required

These are **gates**, not tasks. No `[A]` work may be enabled in a `live` edition until the
matching decision is recorded.

1. **Architecture — RLS is the enforcement layer (must be settled before Slice 0 ships).**
   #464 (and sibling #466) both assert "enforced at the DB layer." The shape of the subset
   policy (Supabase RLS using `matter_shares` membership), how it composes with the #154 wall,
   and how break-glass (#131) is expressed in policy are architecture decisions. #469 is a
   *latent bug today*, so this is the most urgent decision.
2. **Counsel — opposing-party disclosure & service-of-process (per jurisdiction).** The
   portal touches disclosure obligations and the service clock; both the data model (what
   "formally served" means, when the clock starts) and the disclaimer copy need legal review
   per launched edition (QC / US differ). This is inside the OPERATING_CANON legal-review gate.
3. **Counsel / ethics — conflict-of-interest standard.** What constitutes a disqualifying
   conflict for a co-counsel / expert grant is a professional-responsibility determination;
   agents implement a *suggest-only* check, counsel defines the rule and owns the confirm step.
4. **Architecture / privacy — presence & audit retention.** Real-time presence is personal
   data; retention, what is shown to whom (an opposing party should not see co-counsel
   presence), and contact-guard behaviour in cross-party channels need a privacy decision
   (Law 25 / PIPEDA / GDPR).
5. **Architecture — closed-matter freeze semantics.** "Closed matters freeze their trail"
   must be defined precisely (no new shares, no edits, audit immutable) and enforced in RLS,
   not just UI.

Per the **HARD RULES**, no monetization / compliance gate flag or attestation is touched by
this epic, and any migration is **additive-only with the next free number**.

## First safe slice

**Land Slice 0 (= #469) inside #464: enforce `matter_shares` document-subset scope in RLS.**

Why this first:
- **Highest-leverage, lowest-ambiguity.** It is a self-contained **security fix**, not a new
  product surface, so fixing the leak needs no *new* counsel sign-off — the leak already
  violates the existing ownership≠access wall (#154). It only needs decision #1
  (RLS-as-enforcement-layer) recorded.
- The roadmap and the parent plan (`docs/plans/issue-470.md`) both name #469-within-#464 the
  first safe slice and "a latent bug today — unblock everything; close the DB leak."
- It establishes the **RLS-is-the-enforcement-layer pattern** that every later slice of #464
  (and #466) depends on, de-risking the rest of the epic.

Concrete shape (executed in `juge.ca`, **not** here):
1. Add an **additive, next-free-numbered** migration adding an RLS policy on the document
   child tables: a `scope='subset'` share in `matter_shares` filters `SELECT` to the shared
   document IDs; a non-shared document returns **0 rows at the DB layer**, independent of any
   UI filtering. The policy must **AND** with — never OR around — the #154 wall.
2. Add **negative tests**: a `subset`/`review` recipient querying a non-shared document gets
   zero rows; an owner still sees everything; a `full`-scope share is unaffected; write ops
   from a `subset` recipient on a non-shared doc are denied.
3. Run the application gates in `juge.ca`: `tsc --noEmit` (no new errors in touched files) and
   `npm run check:locales` if any user-facing string changes.
4. Open the fix as its own PR referencing **#469** and **#464**; link it under #470.

Everything past Slice 0 stays behind its counsel / architecture gate above and is fanned out
into standalone child tasks on demand (the pattern already used across the meta-epic).

## Definition of done for this planning issue

- [x] Scope of the epic captured (what / why / the seven hard guardrails).
- [x] Concrete sub-task checklist, sequenced into safe slices (`[A]` vs `[H]`).
- [x] Human / architecture / counsel decision gates enumerated.
- [x] First safe slice named, justified, and sequenced (#469 within #464).
- [ ] (Follow-up, in `juge.ca`) implement Slice 0 as its own PR (Refs #469, #464).
