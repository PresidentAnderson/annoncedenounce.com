# Plan — Issue #477: [mobile] Document & PDF viewing + annotation

> Status: PLAN (epic / human-gated). This document is the deliverable. No feature
> code is built here. It defines scope, a concrete sub-task checklist, the
> human / architecture / counsel decisions required, and the first safe slice.

## 0. Repository note (read first)

Issue #477 describes native-quality mobile PDF reading and annotation of **matter
documents** and references implementation primitives that live in the
**`juge.ca`** application — `pdfjs-dist`, `pdf-lib`, the `FileViewer` component,
Bates/exhibit tooling, the `ExportTab`, Supabase Storage, the EPIC-6 encrypted
cache, the `AccessibilityWidget`, and issue #74 (storage streaming).

This repository (`annoncedenounce.com`) is the **static launch site**. It has no
TypeScript application, no `pdfjs-dist`/`pdf-lib`, no Supabase wiring, and no
mobile shell. The Operating Canon (`docs/OPERATING_CANON.md`) names `juge.ca`
as the "Reference implementation patterns" source, which is consistent with the
issue having been authored against that product line.

Implication: the **build** of this epic must land in the `juge.ca` /
mobile-app repository, not here. The first and most important human gate below
is confirming the target repo and re-homing the epic. This plan is written so it
can travel with the issue to that repo unchanged.

## 1. Goal

Native-quality PDF reading plus lightweight annotation of matter documents on
phone and tablet, reusing the existing web viewer stack rather than introducing
a parallel native PDF engine.

## 2. Scope (in)

From the issue's child checklist (all marked `[A]`):

1. Mobile PDF viewer built on existing `pdfjs-dist` / `FileViewer`, touch-tuned:
   pinch-zoom, fling scroll, lazy/virtualized page render. Target: a 200-page
   exhibit scrolls smoothly.
2. Annotation layer (highlight / note / redaction) that writes back through
   `pdf-lib` plus the existing Bates / exhibit tooling; annotations persist and
   re-open correctly on web.
3. Honor issue #74 for viewing: stream documents from Supabase Storage; allow
   offline access **only** through the EPIC-6 encrypted cache.
4. Share / export gated by the existing `ExportTab` controls, surfaced through
   the native share sheet.
5. Accessibility: the PDF text layer is reachable by VoiceOver / TalkBack and
   the viewer respects the existing `AccessibilityWidget`.

## 3. Scope (out / explicitly deferred)

- New OCR or text-extraction pipelines (consume existing text layer only).
- Real-time collaborative / multi-user annotation.
- Server-side rendering or rasterization of PDFs.
- Any change to Bates numbering or exhibit-stamping **logic** (reuse as a black
  box; do not redefine legal numbering rules — see counsel gate).
- Annotation formats not already round-trippable on web.
- Changes to monetization / compliance gate flags, attestations, or
  `lib/version.ts` (hard rules — out of bounds for any slice).

## 4. Architecture decisions required (human / engineering)

- **D1 — Target repository.** Confirm this epic builds in the `juge.ca` mobile
  app repo. Move/clone the issue there and link back. (Blocking.)
- **D2 — Mobile shell strategy.** Is the mobile client a WebView wrapper around
  the existing `FileViewer`, a React Native screen embedding `pdfjs-dist` via a
  WebView, or a Capacitor/Expo hybrid? This decides whether the viewer code is
  literally reused or only its rendering contract is reused. (Blocking for the
  viewer slice.)
- **D3 — Annotation persistence model.** Are annotations (a) burned into the PDF
  via `pdf-lib` on save, (b) stored as a sidecar overlay (e.g. JSON/PDF
  annotation dictionary) referencing page coordinates, or (c) both? Redactions
  in a legal context must be **destructive** on export — confirm the
  web↔mobile round-trip uses the same model so annotations re-open identically.
- **D4 — Offline boundary.** Confirm that EPIC-6 encrypted cache is the *only*
  offline path and that no decrypted PDF or annotation bytes are written to
  plaintext disk, OS thumbnail caches, or share-extension temp dirs.
- **D5 — Coordinate system.** Lock one annotation coordinate space (PDF user
  units vs. rendered CSS pixels at a reference DPI) so highlights line up across
  zoom levels and between web and mobile.
- **D6 — Performance budget.** Define and instrument the "scrolls smoothly"
  acceptance bar for 200 pages (e.g. virtualization window size, max retained
  rendered pages, target frame time) before building.

## 5. Compliance / counsel decisions required

- **C1 — Redaction integrity.** Redaction must remove underlying text/image
  content, not merely cover it. Legal/counsel sign-off required on the redaction
  algorithm and on export verification (no recoverable text under a redaction
  box). This is the single highest-risk item.
- **C2 — Export gating.** Confirm `ExportTab` controls fully govern the native
  share sheet — no path lets a user share/export a document that the existing
  web controls would block (privilege, seal, retention). Default-deny.
- **C3 — Data residency / cache.** Confirm the EPIC-6 encrypted offline cache
  satisfies the same residency and retention obligations as server storage for
  privileged matter documents.
- **C4 — Audit trail.** Confirm whether annotation create/edit/delete and
  export actions must be recorded in the existing audit log for evidentiary
  chain-of-custody.

## 6. Concrete sub-task checklist (for the target repo)

Slice A — Viewer foundation
- [ ] A1 Confirm D2 mobile shell; stand up a screen that loads the existing
      `FileViewer` / `pdfjs-dist` render path.
- [ ] A2 Wire Supabase Storage streaming for viewing (honor #74); no full
      download to plaintext disk.
- [ ] A3 Page virtualization / lazy render with a defined retention window (D6).
- [ ] A4 Touch gestures: pinch-zoom, fling scroll, momentum; tune hit targets.
- [ ] A5 Perf harness: 200-page exhibit, measure against the D6 budget.

Slice B — Accessibility
- [ ] B1 Expose the `pdfjs-dist` text layer to VoiceOver / TalkBack.
- [ ] B2 Honor `AccessibilityWidget` settings (font scaling, contrast, motion).
- [ ] B3 Accessibility test pass on iOS + Android.

Slice C — Annotation
- [ ] C1 Lock coordinate model (D5) and persistence model (D3).
- [ ] C2 Highlight + note creation on the touch text layer.
- [ ] C3 Redaction tool with destructive export (C1) via `pdf-lib`.
- [ ] C4 Persist annotations; verify identical re-open on web.
- [ ] C5 Integrate Bates / exhibit tooling as a reused black box.

Slice D — Offline + Share/Export
- [ ] D1 Offline access strictly via EPIC-6 encrypted cache (D4); plaintext-leak
      check on disk, thumbnails, and share temp dirs.
- [ ] D2 Share/export through native share sheet, gated by `ExportTab` (C2).
- [ ] D3 Audit-log hooks if required by C4.

Slice E — Hardening
- [ ] E1 E2E: open large exhibit, annotate, redact, export, re-open on web.
- [ ] E2 Negative tests: blocked export stays blocked; redacted text
      unrecoverable; offline only when cached.
- [ ] E3 Counsel review of redaction + export evidence (C1, C2, C4).

## 7. First safe slice

The smallest valuable, low-risk increment is **read-only viewing**, which
unblocks everything else and touches no annotation/redaction risk:

> Slice A (A1–A5) + Slice B (accessibility), behind the existing viewing
> permissions, streaming from Supabase per #74, with **no** annotation,
> **no** offline cache, and **no** export changes.

Acceptance for the first slice:
- A 200-page exhibit opens and scrolls smoothly within the D6 budget on a
  mid-range phone.
- Pinch-zoom and fling work; text layer is reachable by VoiceOver / TalkBack.
- Documents stream from Supabase Storage; nothing is written to plaintext disk.
- No annotation, redaction, offline, or export surface is exposed yet.

This slice carries no redaction-integrity or export-gating risk, so it can ship
ahead of the C1–C4 counsel gates while those proceed in parallel.

## 8. Dependencies & references

- Issue #74 — Supabase Storage streaming (must land / be honored first).
- EPIC-6 — encrypted offline cache (offline path dependency).
- Existing components: `FileViewer`, `pdfjs-dist`, `pdf-lib`, Bates/exhibit
  tooling, `ExportTab`, `AccessibilityWidget`.

## 9. Hard rules observed by any implementation slice

- Never edit `lib/version.ts`.
- Never flip monetization / compliance gate flags or attestations.
- Migrations additive-only, using the next free number.
- Touch only files relevant to this epic.
- Redaction and export default-deny; counsel sign-off before C1–C4 ship.
