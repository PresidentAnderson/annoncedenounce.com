# Issue #451 — Content provenance + CI check (child of #417)

> **Cross-repo note.** This planning doc lives in the `annoncedenounce.com`
> operations repo, which is where the autonomy loop tracks work. The
> implementation targets the **`juge.ca`** codebase (the canonical Québec /
> multi-edition app), where `lib/editions.ts`, `lib/content/*`, the `scripts/check-*`
> CI gates and `package.json` `check:*` scripts already live. The juge.ca source
> is not checked out in this worktree, so the deliverable here is a precise,
> ready-to-execute plan rather than the built gate. Ship the implementation in a
> `juge.ca` PR that references #451.

## Goal / acceptance

Parent epic **#417** (per-edition launch gate). This child, item **[A]**:

> Every legal claim sourced + dated; a CI check that fails on unsourced legal
> content / fabricated citations (per GJOS book #377).
>
> **Acceptance:** CI blocks unsourced legal content.

So the unit of done is: (1) a machine-readable provenance contract for legal
content, (2) a CI gate (`npm run check:provenance`) that fails the build when a
legal claim is unsourced, undated, or cites an authority that cannot be
resolved, and (3) the gate wired into `.github/workflows/ci.yml` next to the
existing `check:locales` / `check:edition-purity` / `check:trust-gaps` gates.

This is the **build** half. The **counsel/native-reviewer** sign-off half of
#417 (legal correctness of the claims themselves) is a separate human gate and
remains required before COMMERCIAL ACTIVATION — see "Decisions required".

## Scope

In scope (juge.ca):
- A provenance schema attached to legal-facing content (`lib/content/*` —
  `guides.ts`, `publications.ts`, `platform-guide.ts`, and any edition legal
  copy that asserts statute / form / fee / deadline facts).
- A CI check script (`scripts/check-provenance.mjs`, matching the existing
  `scripts/check-*.mjs` house style) + `package.json` `check:provenance` script.
- CI wiring in `.github/workflows/ci.yml`.
- A short authoring doc (`docs/content/PROVENANCE.md`) so content authors know
  how to satisfy the gate.

Out of scope (explicitly):
- The legal *correctness* review of any claim (human/counsel gate in #417).
- Native-language content review (separate #417 child).
- Flipping any edition `enabled`/`needsReview` flag (separate #417 child;
  HARD RULE: never flip compliance/monetization gates here).
- A live citation-resolver web crawler. v1 validates against a curated,
  in-repo **citation registry**; live verification is a later slice.

## What "provenance" means here (the contract)

Each legal **claim** carries provenance metadata. A claim is any statement that
asserts a verifiable legal fact: a statute/regulation reference, a court/tribunal
rule, a form name/number, a fee amount, or a procedural deadline.

Proposed minimal shape (TypeScript, co-located with the content type):

```ts
export interface Provenance {
  /** Stable id of the source in the citation registry (see below). */
  sourceId: string;
  /** ISO-8601 date the claim was verified against that source. */
  verifiedOn: string;        // e.g. "2026-06-20"
  /** Optional pinpoint: article/section/page within the source. */
  locator?: string;          // e.g. "art. 1457 C.c.Q."
}
```

Legal-facing content modules gain an optional-then-required `provenance:
Provenance[]` field. The gate decides which content is "legal-facing" using an
explicit allow/deny model (see below) so non-legal marketing copy is never
forced to carry citations.

### Citation registry (single source of truth for sources)

`lib/content/citations.ts` (or `data/citations.json`) — a typed registry keyed
by `sourceId`:

```ts
{
  id: "ccq-2024",
  title: "Code civil du Québec",
  jurisdiction: "QC",
  authorityType: "statute",
  url: "https://www.legisquebec.gouv.qc.ca/...",
  retrievedOn: "2026-06-20"
}
```

Benefits: claims reference a registry id (cheap to validate, de-duplicates
sources), and a "fabricated citation" becomes detectable as *a citation whose
`sourceId` is not in the registry* — no fuzzy NLP required for v1.

## CI gate behaviour (`scripts/check-provenance.mjs`)

Mirror `check-ip-protection.mjs` / `check-edition-purity.mjs`: pure Node, no
network, collects `ok(name, pass, detail)` results, prints a table, exits
non-zero on any failure. Checks, in order of confidence:

1. **Registry integrity** — every registry entry has `id`, `title`,
   `jurisdiction`, `authorityType`, `url`, `retrievedOn`; ids are unique.
2. **No dangling citations** — every `provenance[].sourceId` referenced by
   content resolves to a registry entry. *(This is the anti-fabrication check.)*
3. **Sourced + dated** — every legal-facing content item that contains a claim
   has at least one `provenance` entry, each with a valid ISO `verifiedOn`.
4. **Freshness (warn → fail)** — `verifiedOn` / `retrievedOn` older than a
   configurable window (e.g. 18 months) warns first, then becomes a hard fail
   in a later slice once the backlog is cleared.
5. **Edition scope** — a claim's source `jurisdiction` is compatible with the
   edition that renders it (ties into edition-purity work; can be additive).

Determining "legal-facing + contains a claim" for v1 without false positives:
- explicit per-item opt-in flag (`legalFacing: true`) on content types that can
  carry legal claims, **plus**
- a heuristic safety net: scan rendered legal copy for citation-shaped patterns
  (e.g. `art. \d+`, `s. \d+`, `RLRQ`, `C.c.Q.`, `Rule \d+`, form-number shapes)
  and fail if matched text has no `provenance`. The heuristic is advisory in v1
  (reported as warnings) to avoid blocking the build on regex noise, and is
  promoted to a hard fail once tuned.

## Concrete sub-task checklist

- [ ] Add `Provenance` + citation-registry types (`lib/content/provenance.ts`).
- [ ] Create the citation registry seeded with the sources already cited in
      `lib/content/{guides,publications,platform-guide}.ts`.
- [ ] Add `provenance` (and `legalFacing`) fields to the relevant content types;
      backfill existing legal items with their sources + `verifiedOn` dates.
- [ ] Write `scripts/check-provenance.mjs` implementing checks 1–3 as hard
      fails and 4–5 as warnings for v1.
- [ ] Add `"check:provenance"` to `package.json` scripts.
- [ ] Wire `npm run check:provenance` into `.github/workflows/ci.yml` beside the
      other `check:*` gates.
- [ ] Add `docs/content/PROVENANCE.md` (authoring rules + how to add a source).
- [ ] Unit tests under `lib/content/__tests__/` for the registry/claim
      resolution helpers.
- [ ] `tsc --noEmit` and existing `check:*` gates stay green.

## First safe slice (smallest correct increment)

Ship items 1, 2, 4 (types + registry + the script) with checks **1 and 2**
active as hard fails and everything else as **warnings**. This immediately
delivers the highest-value half of the acceptance criterion — CI fails on a
*fabricated / unresolvable* citation — with near-zero false-positive risk and no
content backfill blocking the merge. Tighten checks 3–5 to hard fails in a fast
follow once the registry is backfilled. This is additive, reversible, and flips
no compliance gate.

## Decisions required (human / architecture / counsel)

- **[H/counsel]** The authoritative definition of a "legal claim" that must be
  sourced, and the acceptable source types per jurisdiction (per GJOS book
  #377). The gate enforces *presence + resolvability* of provenance; counsel
  defines *what must be sourced and whether a source is authoritative*.
- **[Architecture]** Registry storage: in-repo typed module vs. JSON vs. a DB
  table. Recommendation: start in-repo (deterministic CI, no network) and
  migrate to a table only if editorial volume demands it (additive migration,
  next free number — never renumber).
- **[Architecture]** Freshness window length and whether/when check 4 becomes a
  hard fail.
- **[H]** Whether live URL/citation resolution (network) is ever run in CI or
  only in a scheduled job, given CI must stay hermetic and fast.
- **[H/counsel]** This gate does NOT certify legal correctness and does NOT flip
  any edition live; the #417 counsel + native-review gates remain prerequisites
  before COMMERCIAL ACTIVATION.

## Risks / notes

- False positives would block authors and erode trust in the gate — hence the
  opt-in flag + warnings-first rollout for heuristic checks.
- Keep the script hermetic (no network) so CI stays deterministic; defer live
  source verification to a scheduled, non-blocking job.
- Reuse the existing `scripts/check-*.mjs` + `package.json` `check:*` +
  `ci.yml` conventions exactly so this is recognizably part of the gate family.
