# Per-Edition Launch-Gate Template

_Reusable Definition-of-Done for activating a new jurisdiction / market edition._

Part of epic **juge.ca#417** (jurisdiction expansion). Child issue **juge.ca#450**.

This is the single checklist every new **live** jurisdiction runs through before
its edition flag is flipped from "preview" to "live". It exists so activation is
**repeatable, audited, and conservative** — no jurisdiction goes live on a hunch.

> Legend: **[A]** an autonomous agent may prepare the work · **[H]** a
> human / counsel / native reviewer must sign off. Agents prepare; humans decide
> the legal and language posture (see `docs/OPERATING_CANON.md` → _Sovereign
> Autonomy Rules_).

---

## 0. How to use this template

1. Copy this file to `docs/launch-gates/<edition-id>.md` (e.g.
   `docs/launch-gates/fr.md`) and fill in the front-matter below for the
   candidate jurisdiction.
2. Work the checklist top-to-bottom. Every box must be checked **and evidenced**
   (a link, commit, PR, or named reviewer) — an unevidenced check does not count.
3. The flip to live (section 7) is the **last** step and is gated on every
   preceding section being complete.
4. Keep the completed copy in the repo as the durable audit record of why the
   edition was allowed to go live.

```
Edition ID:            <e.g. fr>
Jurisdiction:          <e.g. France>
Candidate owner [H]:   <name>
Counsel reviewer [H]:  <name / firm>
Native reviewer [H]:   <name>
Target activation date:<YYYY-MM-DD>
Status:                preview | in-review | approved | LIVE
```

> **Reference:** in the juge.ca codebase the edition registry lives in
> `lib/editions.ts`. New editions default to `enabled: false` +
> `needsReview: true`; this gate is the documented path to `enabled: true` +
> `needsReview: false`. For static launch sites (e.g. annoncedenounce.com) the
> equivalent guard is whatever flag controls whether the jurisdiction is
> presented as a usable product versus a "launching soon" preview surface.

---

## 1. Scope & containment — [A]

- [ ] Edition ID is registered, unique, and resolves (no collision with an
      existing edition or language route).
- [ ] The edition currently serves only as a **preview / "launching soon"**
      surface (disabled), not as a usable product.
- [ ] Data containment is confirmed: this edition's data does not leak into, and
      is not read from, another jurisdiction's store.
- [ ] Default language and offered UI language subset are declared and match the
      jurisdiction's official language(s).

## 2. Legal review — [H / counsel]

> **Gate before commercial activation, not before building.** Per the CTO
> direction on juge.ca#417, development and decomposition proceed ahead of
> counsel review; counsel sign-off is **required before flipping the live flag**.

- [ ] Counsel has reviewed all jurisdiction-specific legal content.
- [ ] Content is **information, not advice** — the disclaimer is present and
      prominent on every legal surface for this edition.
- [ ] **No fabricated statutes, forms, fees, deadlines, or authority names.**
      Every legal claim is real for this jurisdiction (per GJOS book #377).
- [ ] The legal-system family / authority vocabulary (regulator, professional
      title, licence label) is correct for this jurisdiction.
- [ ] Right-of-reply, takedown, evidence, and privacy posture reviewed for this
      jurisdiction's law where applicable.
- [ ] Counsel reviewer named and sign-off dated above.

## 3. Native-language review — [H]

- [ ] A native speaker has reviewed the edition's dictionary / all
      user-facing strings for this jurisdiction.
- [ ] Terminology uses **this jurisdiction's own terms** — no borrowed terms
      from another legal system (see edition-purity, section 5).
- [ ] No machine-translation artifacts, untranslated fallback strings, or
      placeholder copy remain in the shipped UI subset.
- [ ] Native reviewer named and sign-off dated above.

## 4. Content provenance — [A]

- [ ] Every legal claim in this edition is **sourced and dated** (citation to a
      real, retrievable authority).
- [ ] The provenance record is committed to the repo alongside the edition.
- [ ] The CI provenance check passes for this edition (no unsourced legal
      claim ships).

## 5. Edition purity — [A]

- [ ] The edition-purity / cross-jurisdiction-leak harness runs clean for this
      edition (no other jurisdiction's terms, authorities, or professions
      appear). _See the edition-purity verification harness (juge.ca#453)._
- [ ] Only professions/roles that exist under this jurisdiction's legal system
      are listed.
- [ ] No currency, regulator, or template from another edition bleeds in.

## 6. Operational readiness — [A]

- [ ] Domain / route for the edition resolves and renders.
- [ ] Sitemap / SEO entry reflects the edition's status (preview vs. live
      priority).
- [ ] `npm run verify` (or this repo's verifier) passes with the edition
      present.
- [ ] Rollback path is documented: how to revert to preview if a problem is
      found post-launch.

## 7. The flip to live — single audited path — [A] + [H sign-off]

> This is the **only** sanctioned way to activate an edition. Do not flip the
> flag by hand outside this path.

- [ ] **All of sections 1–6 are complete and evidenced.**
- [ ] The candidate is on the launch allow-list.
- [ ] A single PR flips the edition: `needsReview: false` and `enabled: true`
      (or the static-site equivalent live flag) — no other behavioral change in
      that PR.
- [ ] The flip PR links back to this completed gate document.
- [ ] The flip PR carries explicit **[H] human/counsel sign-off** in the review
      (legal + native reviewers approve before merge).
- [ ] Post-merge: confirm the edition serves as a live product and the
      "launching soon" preview surface is gone.

---

## Acceptance (juge.ca#450)

Running this template end-to-end on one candidate jurisdiction yields a
**reviewed, provenance-checked, edition-pure** edition that is ready to flip
live through a single audited path. One template, every jurisdiction.
