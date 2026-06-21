# Plan — Phase 4: Expansion (Q2 2027) — beyond Québec

Epic plan for **juge.ca#66** (mirrored in this static launch repo). PLAN mode: this
document is the deliverable; it does **not** build the feature. It is the coordination
map for the Phase 4 expansion milestone and its enabling machinery.

> Legend: **[A]** an autonomous agent may prepare the work · **[H]** a human / counsel /
> native reviewer must decide or sign off. Agents prepare; humans decide the legal and
> language posture (see `docs/OPERATING_CANON.md` → _Sovereign Autonomy Rules_).

---

## Source

From the epic (juge.ca#66, source `ROADMAP.md §10`):

> Tracking issue for **Phase 4 — Expansion**.
>
> - [ ] Expand beyond Québec to new jurisdictions
> - [ ] Jurisdictional legal content validated per §7.3 (Legal Content Director
>   sign-off + SLAs)

This is the roadmap-level milestone: take the product from a single, Québec-only
edition to a **multi-jurisdiction** platform, with each new jurisdiction reaching the
public only after its legal content is validated and signed off.

---

## Scope

Phase 4 turns "Québec-only" into "Québec + N jurisdictions" **without** lowering the bar
that protects users. It is the parent milestone; the **repeatable launch gate** that
qualifies each candidate jurisdiction is built under the related epic **juge.ca#417**
(mirrored in this repo as `docs/plans/issue-417.md`). This Phase 4 plan owns the
end-to-end expansion: candidate selection, sequencing, the validation gate, and the
human/counsel decisions that gate commercial activation.

In scope:

- A jurisdiction **expansion sequence**: which jurisdiction goes live after Québec, and
  in what order the rest follow.
- The **validation gate** every candidate must pass before going live (delivered by
  #417 and its children): legal-content review, native-language review, content
  provenance, edition purity, and a single audited flip path.
- The **§7.3 validation requirement** — Legal Content Director sign-off plus the SLAs
  that keep validated content accurate over time.
- Keeping this **static launch surface** in lockstep with the application: the public
  site advertises only jurisdictions that have actually passed the gate.

Out of scope (explicitly):

- Flipping any edition to `enabled: true` / `needsReview: false`. No live flag is
  touched by this epic; activation per jurisdiction is a human/counsel-gated event
  performed only via the audited flip path once that jurisdiction's gate is satisfied.
- Authoring or "filling in" legal content for any jurisdiction without counsel review.
- Editing `lib/version.ts`, monetization/compliance gate flags, or attestations.
- Building the gate machinery itself — that is epic #417's deliverable; Phase 4
  **consumes** it and runs it per jurisdiction.

This repo (`annoncedenounce.com`) is a **static launch site**. The runtime expansion
mechanism (editions registry, CI provenance check, allow-list, flip path) lives in the
**juge.ca** application repo. The durable, cross-cutting documentation — the expansion
sequence and the validation requirement — is mirrored here so the launch surface, the
operating canon, and the application stay aligned. This plan tracks both.

---

## Sub-task checklist

Phase 4 is sequenced as: **build the gate once → run it per jurisdiction → flip live
only after sign-off.** The gate-building work is already decomposed under #417; Phase 4
adds the per-jurisdiction run and the §7.3 validation layer.

Gate machinery (delivered by epic #417 — see `docs/plans/issue-417.md`):

- [ ] **[A] Reusable launch-gate template** — Definition-of-Done to flip an edition
  live. _#450._
- [ ] **[A] Content provenance + CI gate** — every legal claim sourced and dated. _#451._
- [ ] **[A] Single audited launch allow-list + flip path** — one sanctioned route to
  `enabled:true`. _#452._
- [ ] **[A] Edition-purity verification** — no cross-jurisdiction leakage of terms,
  authorities, currencies, or professions. _#453._
- [ ] **[H / counsel] Legal-review pre-activation gate** — counsel reviews the
  jurisdiction's legal content. _#455._
- [ ] **[H] Native-language review pre-activation gate** — native speaker reviews all
  user-facing strings. _#456._

Phase 4 expansion run (this epic):

- [ ] **[H] Define the expansion sequence** — pick the first post-Québec jurisdiction(s)
  and the order of the rest (decides #454's scaffold and the first gate run).
- [ ] **[A] Candidate scaffold** — staged, **disabled** edition content for the chosen
  candidate. _#454._
- [ ] **[H / counsel] §7.3 validation** — Legal Content Director sign-off that the
  candidate's legal content is real, information-not-advice, and free of fabricated
  statutes/forms/fees, recorded in the completed gate copy.
- [ ] **[H] §7.3 SLAs** — define and record the freshness / review-cadence SLAs that
  keep validated jurisdictional content accurate after launch (not a one-time check).
- [ ] **[A] Run the gate per candidate** — copy the #450 template to a per-edition gate
  file, walk it top-to-bottom, gather evidence.
- [ ] **[H / counsel] Activation** — flip the candidate live via the audited path
  (#452) only after the gate and §7.3 sign-off are evidenced.
- [ ] **[A] Sync the launch surface** — once a jurisdiction is live, update this static
  site to reflect it (and never advertise an unlaunched one).

### Acceptance (from the issue)

The product is **expanded beyond Québec** to at least one new jurisdiction, and that
jurisdiction's legal content is **validated per §7.3** (Legal Content Director sign-off
plus the freshness SLAs). The activation flip itself remains a separate, human/counsel-
gated action performed only through the audited path.

---

## Human / architecture / counsel decisions required

These are blockers the agent **cannot** decide; they gate commercial activation, not the
build (per the CTO direction below).

1. **[H] Expansion sequence.** Which jurisdiction goes live first after Québec, and in
   what order the rest follow? Drives #454 and the first gate run. Inputs: market size,
   legal-content availability, language coverage, regulatory risk.
2. **[H / counsel] §7.3 sign-off.** Legal Content Director confirms each candidate's
   legal content is real, information-not-advice, and free of fabricated
   statutes/forms/fees — the named, dated approval recorded in the completed gate copy.
3. **[H / counsel] §7.3 SLAs.** The committed review cadence and freshness guarantees
   that keep validated content accurate after launch, and who owns each SLA.
4. **[H] Native-language sign-off.** Each edition's dictionary uses the jurisdiction's
   own terminology with no MT artifacts or fallback strings (#456).
5. **[Architecture] Single flip path enforcement.** Confirm the allow-list + audited
   flip mechanism (#452) is the *only* route to `enabled:true`, and how CI/review guards
   against any manual flag flip outside it.
6. **[Architecture] Multi-jurisdiction data model readiness.** Confirm the editions
   registry, currency/authority/profession handling, and routing scale cleanly to N
   jurisdictions before the second edition is added (edition purity per #453).
7. **[H / counsel] Final activation authority.** Who is allowed to perform the flip once
   the gate and §7.3 are evidenced, recorded in the operating canon.

> **CTO direction (2026-06-19):** Development and decomposition proceed **ahead of**
> counsel review. Counsel-approved legal / native-language validation is a **required
> gate before COMMERCIAL ACTIVATION** (flipping the live flag), not a blocker to
> building. Counsel advice is incorporated at the activation stage.

---

## First safe slice

Ship the **expansion plan and its validation requirement, with nothing activated** —
pure documentation; the gate machinery (#417 and children) lands separately and
preview-only. This is the smallest correct step that makes Phase 4 real and auditable
while touching no live flag.

1. Land this expansion coordination map and cross-reference it from
   `docs/OPERATING_CANON.md` and the README docs tree so the milestone is discoverable
   alongside the #417 gate plan.
2. Let the gate machinery land via #417 (template #450, provenance #451, flip path #452,
   edition purity #453, review gates #455/#456) — all with every edition disabled.
3. Record the **§7.3 validation requirement and SLA shape** as the per-jurisdiction
   acceptance bar, so no candidate can be queued without it.
4. Only then, once the expansion sequence is chosen by **[H]** (decision 1), scaffold the
   first candidate (#454, disabled), run the gate, and gather §7.3 evidence. The flip to
   live remains out of scope here and is performed solely via the audited path after
   counsel + native sign-off.

No edition is enabled, no `needsReview` flag is flipped, and no monetization/compliance
gate is touched by this slice.

---

## References

- Epic: juge.ca#66 (Phase 4 — Expansion, `ROADMAP.md §10`)
- Related epic: juge.ca#417 — per-edition launch gate · `docs/plans/issue-417.md`
- Children of #417: #450, #451, #452, #453, #454, #455, #456
- `docs/EDITION-LAUNCH-GATE.md` — the reusable gate template (#450)
- `docs/OPERATING_CANON.md` — Sovereign Autonomy Rules & product-safety principles
- juge.ca `lib/editions.ts` — edition registry (`enabled` / `needsReview` flags)
- ROADMAP.md §7.3 — jurisdictional legal-content validation (Legal Content Director
  sign-off + SLAs)
- GJOS book #377 — information-not-advice; no fabricated statutes/forms/fees
