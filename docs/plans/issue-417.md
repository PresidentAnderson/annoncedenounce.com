# Plan — Jurisdiction expansion: per-edition launch gate & review process

Epic plan for **juge.ca#417** (mirrored in this repo). PLAN mode: this document is the
deliverable; it does **not** build the feature. It is the coordination map for the epic
and its already-fanned-out children.

> Legend: **[A]** an autonomous agent may prepare the work · **[H]** a human / counsel /
> native reviewer must decide or sign off. Agents prepare; humans decide the legal and
> language posture (see `docs/OPERATING_CANON.md` → _Sovereign Autonomy Rules_).

---

## Scope

Most editions ship intentionally **disabled** and **needing review** (in the juge.ca
codebase, `lib/editions.ts`: `enabled: false` + `needsReview: true`; on this static
launch site, the equivalent is the "launching soon" preview surface vs. a usable
product). The epic builds the **repeatable launch gate** that takes one candidate
jurisdiction from preview to live with legal review, native-language review, content
provenance, and edition purity all evidenced, behind a single audited flip path.

In scope:

- A reusable per-jurisdiction launch checklist / Definition-of-Done (the gate itself).
- The supporting mechanisms each checklist item depends on: provenance CI check,
  launch allow-list + single audited flip path, edition-purity verification, and the
  legal / native-language review gates that block commercial activation.
- Selecting and sequencing the next candidate jurisdiction(s).

Out of scope (explicitly):

- Flipping any edition to `enabled: true` / `needsReview: false`. No live flag is
  touched by this epic; activation is a human/counsel-gated event performed only via
  the audited flip path once the gate is fully satisfied.
- Authoring or "filling in" legal content for a jurisdiction without counsel review.
- Editing `lib/version.ts`, monetization/compliance gate flags, or attestations.

This repo (`annoncedenounce.com`) is a **static launch site**. Most of the runtime
mechanism (editions registry, CI provenance check, allow-list) lives in the **juge.ca**
application repo. The cross-cutting, durable documentation — the gate template and the
review-gate plans — is mirrored here so the launch surface, the operating canon, and the
application stay in lockstep. This plan tracks both.

---

## Sub-task checklist (mapped to children)

The epic has already been decomposed and fanned out. Each child has its own PR; this
list is the single place to see the whole gate and its status.

- [ ] **[A] Reusable launch-gate template** — the Definition-of-Done to flip an edition
  live. _Child **#450** → `docs/EDITION-LAUNCH-GATE.md` (PR open in this repo)._
- [ ] **[A] Content provenance + CI gate** — every legal claim sourced and dated; CI
  fails on unsourced legal claims. _Child **#451** (PR open in this repo)._
- [ ] **[A] Single audited launch allow-list + flip path** — one sanctioned
  `needsReview:false` / `enabled:true` route, nothing flipped by hand. _Child **#452**
  (PR open in juge.ca)._
- [ ] **[A] Edition-purity verification** — no other jurisdiction's terms, authorities,
  currencies, or professions leak into the new edition. _Child **#453** (done)._
- [ ] **[A/H] Next candidate jurisdiction scaffold + sequence** — staged, disabled
  content for the chosen candidate. _Child **#454** (PR open in juge.ca)._
- [ ] **[H / counsel] Legal-review pre-activation gate** — counsel reviews the
  jurisdiction's legal content; information-not-advice; no fabricated statutes / forms /
  fees (per GJOS book #377). _Child **#455** (PR open in this repo)._
- [ ] **[H] Native-language review pre-activation gate** — native speaker reviews the
  edition dictionary / all user-facing strings. _Child **#456** (PR open in this repo)._

### Acceptance (from the issue)

A documented gate exists, and running it on **one** candidate jurisdiction yields a
reviewed, provenance-checked, edition-pure edition **ready to flip live** (the flip
itself remaining a separate, human/counsel-gated action).

---

## Human / architecture / counsel decisions required

These are blockers the agent **cannot** decide; they gate commercial activation, not the
build (per the CTO direction below).

1. **[H] Next candidate jurisdiction(s) + sequence.** Which jurisdiction goes through
   the gate first, and in what order do the rest follow? Drives #454's scaffold and the
   first run of the gate.
2. **[H / counsel] Legal sign-off** that a candidate's legal content is real,
   information-not-advice, and free of fabricated statutes/forms/fees — the named,
   dated approval recorded in the completed gate copy (#455).
3. **[H] Native-language sign-off** that the edition's dictionary uses the
   jurisdiction's own terminology with no MT artifacts or fallback strings (#456).
4. **[Architecture] Where the single flip path lives and how it is enforced.** Confirm
   the allow-list + audited flip mechanism (#452) is the *only* way `enabled:true` can be
   reached, and decide how that is guarded in CI / review (e.g. a check that fails any
   manual flag flip not routed through the allow-list).
5. **[Architecture] Provenance record format** — the committed shape of the
   sourced-and-dated legal-claim record the CI check (#451) reads, so all editions use
   one schema.
6. **[H / counsel] Final activation authority** — who is allowed to perform the flip
   once sections 1–6 of the gate are evidenced, recorded in the operating canon.

> **CTO direction (2026-06-19):** Development and decomposition proceed **ahead of**
> counsel review. Counsel-approved model / native-language review is a **required gate
> before COMMERCIAL ACTIVATION** (flipping the live flag), not a blocker to building.
> Counsel advice is incorporated at the activation stage.

---

## First safe slice

Ship the **gate template and the review-gate plans, with nothing activated** — pure
documentation and (in juge.ca) preview-only scaffolding. This is the smallest correct
step that makes the gate real and auditable while touching no live flag.

1. Land the reusable launch-gate template (#450) as the canonical Definition-of-Done and
   cross-reference it from `docs/OPERATING_CANON.md` and the README docs tree so it is
   discoverable. _(Already in progress.)_
2. Land the legal-review (#455) and native-language (#456) pre-activation gate plans so
   the two human gates are documented and unambiguous before any candidate is queued.
3. Land the provenance CI gate (#451) and allow-list / audited flip path (#452, juge.ca)
   so the mechanisms a future flip depends on exist and run clean — still with every
   edition disabled.
4. Only then, once a candidate is chosen by **[H]** (decision 1), copy the template to a
   per-edition gate file, run the checklist top-to-bottom, and gather evidence. The flip
   to live remains out of scope here and is performed solely via the audited path after
   counsel + native sign-off.

No edition is enabled, no `needsReview` flag is flipped, and no monetization/compliance
gate is touched by this slice.

---

## References

- Epic: juge.ca#417 · Children: #450, #451, #452, #453, #454, #455, #456
- `docs/EDITION-LAUNCH-GATE.md` — the reusable gate template (#450)
- `docs/OPERATING_CANON.md` — Sovereign Autonomy Rules & product-safety principles
- juge.ca `lib/editions.ts` — edition registry (`enabled` / `needsReview` flags)
- GJOS book #377 — information-not-advice; no fabricated statutes/forms/fees
