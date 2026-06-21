# Plan — Issue #98 · [epic] Lifecycle document taxonomy

> **Mode:** PLAN / human-gated. This document is the deliverable. It does **not** build the
> taxonomy, change the document model, or touch any persisted data. The taxonomy redesign is an
> *architecture* epic: it changes how every document is classified, stored, and advanced through
> the dispute lifecycle, so the data-model and the legal-information boundary need human sign-off
> before any agent edits code.
>
> Reference implementation lives in **`juge.ca`** (the Next.js app this static site fronts — see
> [`OPERATING_CANON.md`](../OPERATING_CANON.md), "Reference implementation patterns"). File paths
> below (`lib/store/cases.ts`, etc.) refer to that app. This repo (`annoncedenounce.com`) carries
> the plan so the issue has a tracked PR; implementation slices land in the app repo.
>
> Where this plan and the epic disagree, the **epic is authoritative** — this is the routing and
> sequencing layer, not new policy.

Refs #98.

Related epics/issues: #86 (Conflict-OS lifecycle), #87 (classify-at-intake), #91 (advance-the-
matter workflow), #97 (Communications type — first shipped sliver), #100 (Dispute vs Matter
objects), #460 (jurisdiction deadline rule-packs), #541 (held-back backlog — lists #98 §3.A).

---

## 1. Scope

**Problem.** The current `DocTag` taxonomy (`lib/store/cases.ts`) is **flat and litigation-
centric** — it presumes a dispute already exists and a court procedure is underway. Juge.ca's
mission is broader: classify **every document from first complaint through final enforcement.**

**In scope (the epic).** Replace the flat `DocTag` with a **hierarchical lifecycle taxonomy**
— a bilingual `{phase → category → type}` tree mirroring the Conflict-OS lifecycle (#86) — and a
**structured per-document classification** (`phase`, `category`, `type`, `confidence`,
`suggestedNextStep`) that feeds classify-at-intake (#87), the advance-the-matter workflow (#91),
and the resolution engine.

**In scope of THIS PR.** Only this plan doc. Markdown. No code.

**Out of scope of THIS PR.** Building the taxonomy module; adding fields to the document model;
any migration; editing the intake classifier or Evidence filter; `lib/version.ts`; monetization
or compliance gate flags; attestations; any change that mutates persisted data.

**Why a plan and not a build.** This epic carries all three of the project's standing gate risks
at once: (a) a data-model change that runs on every stored matter load **[H-DATA]**, (b) tenant-
scoped persistence of new classification fields **[H-RLS]**, and (c) `suggestedNextStep` /
phase labels are **legal-information shown to litigants** across QC procedure and enforcement —
unauthorized-practice-of-law (UPL) and wrong-jurisdiction exposure **[H-LEGAL]**. The 2026-06-20
decomposition already filed #98 as `oneshot_feasible: false` (see #541 §3.A). This doc makes the
sequencing legible so it can be promoted one safe, additive slice at a time.

---

## 2. Gate classes (project-standard)

Same four gates the rest of the backlog uses (see `docs/plans/issue-541.md` in the app repo). A
slice with two badges needs **both** sign-offs before code is written.

| Gate | Trigger in this epic | Who signs off | Artifact required before code |
|---|---|---|---|
| **[H-DATA]** Data-model / migration | New persisted fields on the document/evidence model; back-compat mapping that runs on every matter load | Eng lead + DBA | ADR with forward/back migration, `DocTag → type` backfill, rollback; dry-run on a prod-data copy |
| **[H-RLS]** Tenant isolation | New columns stored under tenant-scoped rows; filter/query surface | Eng lead + security reviewer | RLS policy diff + a cross-tenant leak test (fails before / passes after) |
| **[H-LEGAL]** UPL / jurisdiction | Phase/type labels and `suggestedNextStep` are legal-information; QC C.p.c. procedure names; enforcement steps | Counsel (per jurisdiction) | Counsel memo on `docs/handoffs`; per-jurisdiction UPL red-team of the label set + next-step strings |
| **[H-EXT]** External / secrets | (Not triggered by this epic on its own.) | — | — |

---

## 3. Sub-task checklist (sequenced; matches the epic's "Non-destructive sequencing")

### Slice 0 — Taxonomy definition module *(SAFE; first slice — see §5)*
- [ ] Add a **pure, additive** taxonomy module (e.g. `lib/store/lifecycle-taxonomy.ts`): the
      bilingual `{phase → category → type}` tree, typed, with stable string IDs. No imports into
      runtime paths yet, no model change, no UI wiring. _(no gate — definition only)_
- [ ] Encode the full hierarchy from the epic (§ "Hierarchy", reproduced in §6 below): Phase 0
      Prévention, Phase 1 Résolution (Communication / Réclamation / Service client / Ombudsman-
      Médiation / Mise en demeure), Phase 2 Pré-litige, Phase 3 Litige (Procédures / Preuve /
      Notifications / Décisions), Phase 4 Exécution.
- [ ] Export a **back-compat map** `DocTag → {phase, category, type}` as data (still no behavior
      change) so later slices can migrate without re-deriving it.
- [ ] Unit tests: tree is well-formed (unique IDs, every type has a parent), every existing
      `DocTag` maps to exactly one type, both locales present for every node.

### Slice 1 — Structured fields on the document model _[H-DATA][H-RLS]_
- [ ] Add `phase`, `category`, `type`, `confidence`, `suggestedNextStep` to the document/evidence
      model **alongside** (not replacing) `DocTag`. Optional/nullable so existing records load.
- [ ] Migration: **additive, next free number**, backfill from the `DocTag → type` map; idempotent;
      forward+rollback documented. Dry-run on a prod-data copy.
- [ ] RLS: confirm new columns inherit the existing matter/tenant scope; add the cross-tenant
      leak test. _(blocked on the §4 decisions)_

### Slice 2 — Surface in intake classifier (#87) + Evidence filter _[H-LEGAL]_
- [ ] Intake classifier returns `{phase, category, type, confidence, suggestedNextStep}` instead
      of a flat tag; show confidence; let the user correct the suggestion.
- [ ] Evidence type filter switches to the hierarchy (phase → category → type drill-down).
- [ ] **Default rule:** Gmail / `.eml` imports → `Phase 1 ▸ Communication ▸ Courriel` (this is the
      #97 sliver, now a node in the tree). _(blocked on counsel review of label strings)_

### Slice 3 — Wire `suggestedNextStep` into advance-the-matter (#91) + resolution engine _[H-LEGAL]_
- [ ] Feed `suggestedNextStep` into the advance workflow (#91) and resolution recommendations.
- [ ] Every surfaced next-step must carry the information-not-advice disclaimer boundary and be
      edition/jurisdiction-gated (non-QC matters must not see QC procedure steps). _(counsel-gated)_

### Slice 4 — Deprecate the flat `DocTag` _[H-DATA]_
- [ ] Only once every read/write path consumes the structured fields: mark `DocTag` deprecated,
      keep it readable, remove writers, schedule removal in a later additive migration.

---

## 4. Human / architecture / counsel decisions required (gating questions)

Must be answered **before** the corresponding slice leaves the backlog:

1. **Field shape & where it lives [H-DATA].** Are the five fields columns on the existing
   document/evidence row, or a child `classification` object? Decides the migration shape and
   whether Slice 1 is purely additive. → eng ADR + reviewed migration. *Blocks Slice 1.*
2. **Stable ID scheme [H-DATA].** Phase/category/type IDs must be **stable strings** (not array
   indices or FR labels) so renames/translations don't corrupt stored data. Confirm the ID
   convention and that `DocTag` values map 1:1 onto type IDs with no orphans. *Blocks Slice 0→1.*
3. **Authoritative label source vs Loi 96 [H-LEGAL].** FR labels are primary (per the epic). Is FR
   the legally-authoritative locale, with EN derived? This intersects the `TranslatedField`
   provenance question (#468). → counsel. *Blocks Slice 2.*
4. **UPL boundary on `suggestedNextStep` [H-LEGAL].** The phase/category names and every
   next-step string are legal-information. Counsel must red-team the full label set + next-step
   strings per jurisdiction and confirm the disclaimer boundary (ties to #463 agent-boundary).
   *Blocks Slices 2 & 3.*
5. **Jurisdiction gating of Phase 3/4 [H-LEGAL].** Phase 3 (Litige — QC C.p.c. procedure names)
   and Phase 4 (Exécution) are QC-specific. How are they edition-gated so non-QC matters never
   see wrong-jurisdiction types/steps? Ties to #460 deadline rule-packs and #462 edition-gating.
   *Blocks Slices 2 & 3.*
6. **Confidence semantics & low-confidence UX [H-LEGAL].** What does `confidence` mean (model
   probability vs calibrated), what's the threshold below which we must **not** auto-advance, and
   what does the user see at low confidence? *Blocks Slice 3.*
7. **Dispute vs Matter coupling (#100).** The lifecycle straddles the pre-dispute and litigation
   phases — does classification attach to a `Dispute`, a `Matter`, or both? Must reconcile with
   the #100 object-split decision so we don't migrate twice. *Cross-blocks Slice 1.*

---

## 5. First safe slice

**Slice 0 — the taxonomy definition module — is the one slice that can ship now without a gate.**

It is pure data + types: a typed, bilingual `{phase → category → type}` tree plus a
`DocTag → type` map and unit tests. It imports nothing into runtime paths, changes no persisted
model, writes no migration, touches no RLS surface, and shows no new legal-information to a user
(nothing renders it yet). It is the literal first step of the epic's own non-destructive
sequencing ("Add a taxonomy definition module — no behavior change") and gives every later slice
a single source of truth to build against.

**Acceptance for Slice 0:** the module compiles; tree is well-formed (unique stable IDs, every
type has a parent, both locales present); every existing `DocTag` maps to exactly one type with no
orphans; tests pass in the app repo's CI. No migration, no UI, no model change.

Everything after Slice 0 is gated by §4 and must not be auto-merged.

---

## 6. Hierarchy reference (verbatim from the epic, for the Slice 0 tree)

**Phase 0 — Prévention & Information:** information générale · politique/contrat · conditions
d'utilisation · facture · reçu · garantie · communication préventive · avis interne

**Phase 1 — Résolution du différend**
- **Communication** (Gmail imports default here → *Courriel*): courriel · lettre · message texte ·
  conversation · appel téléphonique · réunion · communication interne · communication externe
- **Réclamation:** plainte · réclamation · signalement · demande d'information · demande de
  correction · contestation
- **Service client:** service à la clientèle · gestionnaire · département spécialisé · escalade
  interne
- **Ombudsman / Médiation:** ombudsman · médiation · conciliation · arbitrage · négociation
- **Mise en demeure:** mise en demeure · réponse à mise en demeure

**Phase 2 — Pré-litige:** consultation juridique · avis juridique · analyse de dossier ·
recherche juridique · évaluation des recours · préparation de procédure

**Phase 3 — Litige** (today's flat list)
- **Procédures:** demande introductive · défense · demande reconventionnelle · requête incidente ·
  requête en cours · appel
- **Gestion de preuve:** déclaration sous serment · pièce · affidavit · expertise · rapport
- **Notifications:** avis de présentation · citation à comparaître · signification
- **Décisions:** jugement · ordonnance

**Phase 4 — Exécution:** saisie · exécution · hypothèque judiciaire · perception · entente de
paiement · insolvabilité · faillite

### Structured classification model (don't make the user pick a flat type)

| Field | Example |
|---|---|
| Lifecycle phase | Dispute Resolution |
| Category | Communication |
| Type | Email |
| Confidence | 93% |
| Suggested next step | Escalate to Ombudsman |

---

## 7. Notes

- Markdown only — no code, migrations, RLS policy, `lib/version.ts`, monetization/compliance gate
  flags, or attestations touched in this PR. No `.ts` files changed, so no new type errors.
- Migration numbering for Slice 1 must use the **next free number** in the app repo at
  implementation time (not reserved here, to avoid collisions with parallel work).
- This plan is additive to and consistent with the #541 governed backlog, which already lists
  #98 under "A. Lifecycle data-model & freemium" as `[H-DATA]`.
