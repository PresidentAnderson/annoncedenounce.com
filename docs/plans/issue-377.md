# Issue #377 — GJOS Engineering Book conformance & mirror (plan)

Refs #377.

## Why this is a plan, not a code change

Issue #377 — *"GJOS Engineering Book — authoritative build constitution (mirror)"* — is filed
against the **juge.ca** repository. Its source of truth is
`docs/GLOBAL_JUSTICE_OPERATING_SYSTEM_ENGINEERING_BOOK.md` **in juge.ca** (≈1,630 lines), and the
GitHub issue is an explicit *mirror* of that local doc for assignment and discussion.

That source tree is **not** checked out in this `annoncedenounce.com` worktree (only juge.ca's
`node_modules` is symlinked in for tooling). Editing the book here would either be a no-op or would
fork the constitution into the wrong repo. Per `docs/OPERATING_CANON.md`, juge.ca is this repo's
*reference implementation*, and per the orchestrator's plan-doc fallback this PR therefore carries a
plan that (a) records how `annoncedenounce.com` conforms to the book and (b) lists the concrete
mirror/governance work, while the book edits themselves ship in a juge.ca PR referencing #377.

This matches the established sibling pattern in this repo: PR #45 (`issue-451`) and PR #49
(`issue-450`) carried plan docs for juge.ca-targeted issues rather than building juge.ca code here.

## Scope

- **In scope (this repo):** document the conformance contract between `annoncedenounce.com`
  (a downstream sibling product) and the GJOS book; enumerate the mirror-hygiene and governance
  sub-tasks; identify which book volumes bind this static launch site today.
- **In scope (juge.ca, separate PR):** the actual deepening/maintenance of the book and the
  GitHub-mirror cross-links described in the issue's "Next deepening candidates".
- **Out of scope:** any change to `lib/version.ts`; any monetization/compliance gate flag or
  attestation; non-additive migrations; anything legal-posture-deciding (canon §51 — agents prepare,
  humans decide).

## How `annoncedenounce.com` maps onto the GJOS book

`annoncedenounce.com` is a static, evidence-first denunciation/launch surface. It is a downstream
sibling of the GJOS platform and inherits the book's binding front matter. The volumes that govern
this repo **today** are:

| GJOS book element | Binding obligation on this repo | Where it lives here |
| --- | --- | --- |
| Front Matter — Safety & Legal-Information Boundary | Information not advice; allegation-safe language; no fabrication; right-of-reply; professional handoff | `docs/OPERATING_CANON.md` §"Product Safety Principles", landing copy |
| Volume IV — Ethics & advertising constraints | No UPL; honest claims | landing page copy review |
| Volume VI — Global Language Architecture | FR/EN parity, Loi 96 / FR authority, BCP-47 locales | i18n of `index.html` / locale files |
| Volume XI — Cross-Cutting (security, audit, observability/DR) | versioned releases, audit trail, `/api/version` provenance | `version.json`, `/api/version`, CI verifier |
| Volume XII — Build Sequencing | v5 Canada-first cadence; launch-gate discipline | `canon.lock.yaml`, autonomy/CI workflows |
| Appendix E — Document Map | the book governs; local specs are appendices | this plan + `OPERATING_CANON.md` |

The deliverable doc this plan proposes is a short **conformance appendix** in this repo that pins
the table above so the static site cannot silently drift from the constitution.

## Sub-task checklist

### A. Mirror hygiene (juge.ca PR, refs #377)
- [ ] Confirm the GitHub issue body still matches `docs/GLOBAL_JUSTICE_OPERATING_SYSTEM_ENGINEERING_BOOK.md` (volume map, appendices A–F, line count).
- [ ] Add/refresh the cross-link from the book's Appendix E to the mirror issue and back.
- [ ] Note the book's current version alongside `lib/version.ts` in the release note (do **not** edit `lib/version.ts`).

### B. Conformance in this repo (annoncedenounce.com)
- [ ] Land a `docs/GJOS_CONFORMANCE.md` appendix carrying the mapping table above (first safe slice — see below).
- [ ] Cross-reference it from `docs/OPERATING_CANON.md` "Canon Sources".
- [ ] Add a verifier note (non-gating) that flags when landing copy contains advice-shaped or fabrication-prone strings (statute/citation/deadline/fee patterns) so the safety boundary is mechanically observable.

### C. Deepening candidates (juge.ca, future PRs)
- [ ] Explode Volume III workspaces into per-screen specs.
- [ ] Migration-ready SQL + RLS test suite from Appendix F (additive migrations, next free number only).
- [ ] Per-jurisdiction pack template (Volume VII).

## Human / architecture / counsel decisions required

1. **Counsel (blocking for COMMERCIAL ACTIVATION):** sign-off that landing/denunciation copy honors
   the Safety & Legal-Information Boundary (information-not-advice, allegation-safe, right-of-reply)
   under QC/Canada law incl. Loi 96. Agents prepare; counsel decides (canon §51).
2. **Architecture:** confirm `annoncedenounce.com` is a *consumer* of the GJOS constitution (no fork)
   and that conformance lives as a thin appendix, not a copy of the book.
3. **Product:** confirm which book volumes are in-scope for the static launch milestone vs deferred to
   the full platform (the table above is the proposed answer).

## First safe slice

Ship `docs/GJOS_CONFORMANCE.md` in this repo containing only the mapping table and a one-line pointer
to the juge.ca book as source of truth, then link it from `docs/OPERATING_CANON.md`. This is
documentation-only: it touches no `lib/version.ts`, no gate flags, no migrations, and no legal
posture — it merely makes this repo's existing obedience to the constitution explicit and reviewable.
The book edits and the mirror cross-links (sub-tasks A and C) follow in a juge.ca PR that references
#377.
