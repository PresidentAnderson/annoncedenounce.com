# Plan — Part XII/XIV: Criminal Justice Navigation (Canada + US / Judge911)

Tracks **`PresidentAnderson/juge.ca#156`** (epic, human-gated).
Mode: **PLAN** — this document is the deliverable. No feature code is produced here.

> Repo note: epic #156 and all of its implementation live in the **`juge.ca`** repository
> (`lib/criminal-justice/*`, `app/[lang]/criminal-justice/*`, `app/[lang]/judge911/*`).
> This plan is authored in the `annoncedenounce.com` worktree per the workflow harness;
> the actual build slices below ship in `juge.ca`. All cross-repo references use the
> fully-qualified `PresidentAnderson/juge.ca#NNN` form.

---

## 1. Scope

Build the bilingual, free, two-audience (end-user + counsel) **Criminal Justice Navigation**
experience spanning Part XII (Canada) and Part XIV (US / Judge911), driven by **one engine, no
fork**. The end state is an interactive `ws.detention_facility` workspace: public, accurate,
jurisdiction-tagged facility information; a walled private detainee↔counsel matter space behind
the Part V privilege wall; and an arrest→court→detention rights track rendered for both audiences
in EN/FR.

### In scope
- Interactive `ws.detention_facility` workspace (public page + walled private matters) — Canada and US share the engine.
- Per-facility routes (operator / type / visiting / oversight) for CA (provincial+territorial+CSC federal) and US (federal/state/county).
- Two-audience arrest→court→detention rights track (end-user + counsel views), bilingual, disclaimed as information, not advice.
- Duty-counsel / legal-aid one-tap routing per jurisdiction.
- Privilege wall for private detainee↔counsel matters (depends on encryption + consent primitives).
- US edition parity (G99–G101) on the same engine as CA.
- Youth sub-track surfacing (identity protection on by default; separate rehabilitative custody).

### Out of scope / flagged distinct (do NOT conflate)
- Immigration detention (ICE / CBSA) — separate regime, flagged distinct.
- Tribal / Indigenous-nation detention as an *immigration* matter — kept distinct; Indigenous-operated **healing lodges** remain true-to-operator in the registry, not reclassified.
- Disclosure of any individual's detention **status** — never (G90).
- Legal advice — the product gives information and routes to counsel; it does not advise.

### Already landed (do not rebuild)
- `lib/criminal-justice/ca.ts` — CA detention registry, CSC regions, rights-track data, youth profile (#146, #148 — **CLOSED/merged** on `juge.ca` main).
- `lib/criminal-justice/us.ts` — US detention facility model + rights stages (#147 lineage; on `juge.ca` main).
- `app/[lang]/criminal-justice/page.tsx` — FR-first rendering of the CA rights track + registry summary.
- `app/[lang]/judge911/page.tsx` + `components/Judge911Landing.tsx` — US bilingual landing.
- Test suites: `lib/criminal-justice/__tests__/{ca,ca-youth,us}.test.ts`.

The remaining epic gap is the **interactive workspace, per-facility routes, the privilege wall,
duty-counsel routing, and US/CA engine parity** — the data layer exists; the navigable workspace does not.

---

## 2. Sub-task checklist

Children #146/#147/#148 are CLOSED; this is the remaining epic surface.

- [ ] **Engine extraction.** Factor the shared workspace contract out of `ca.ts`/`us.ts` into a country-agnostic `ws.detention_facility` engine (one engine, no fork). Both registries become inputs.
- [ ] **Public facility routes.** `app/[lang]/criminal-justice/facility/[slug]` (CA) + `app/[lang]/judge911/facility/[slug]` (US): operator, type, visiting, oversight/legal-aid — public, no status disclosure (G89, G90).
- [ ] **Rights-track stage pages.** Per-stage arrest→court→detention pages, two audiences (end-user / counsel), bilingual, disclaimed (G87).
- [ ] **Walled private matters.** `ws.detention_facility` private detainee↔counsel space behind the Part V privilege wall — depends on encryption + consent primitives (G88).
- [ ] **Duty-counsel / legal-aid routing.** Per-jurisdiction one-tap routing to duty counsel / legal aid for CA and US.
- [ ] **US edition parity (G99–G101).** Same engine surfaces US facilities + rights stages; ICE/immigration + tribal detention stay flagged distinct.
- [ ] **Youth surfacing.** Wire the existing CA youth profile into the workspace: identity protection on by default, separate rehabilitative custody, no adult co-location (G95, G96).
- [ ] **Build-time validation.** Block deploy on unvalidated (`–`) seed lists; assert housing ≠ legal jurisdiction; healing lodges true-to-operator (G97, G98).
- [ ] **Guardrail gates in CI.** Encode G87–G101 as automated checks in `scripts/eval/judge911-eval.mjs` and the criminal-justice test suites.

---

## 3. Human / architecture / counsel decisions required (human-gated)

1. **Counsel sign-off on rights-track copy (EN+FR, both audiences).** Charter ss.7–12, Stinchcombe, Jordan (CA) and the US stages must be reviewed by qualified counsel before publish; the "information, not advice" disclaimer wording is legal-approved, not engineering-authored.
2. **Privilege-wall architecture.** Confirm the encryption + consent primitives (Part V) that back the walled detainee↔counsel matters — which keys, retention, and lawful-access posture. Requires security + counsel.
3. **No-status-disclosure invariant (G90).** Agree the enforcement model (data model + access control) guaranteeing the product can never reveal whether a named person is detained, including via inference.
4. **Seed-list validation authority.** Decide who/what is the authoritative operating-authority source per jurisdiction that flips a `–` seed entry to validated, and the cadence (G97).
5. **Jurisdiction taxonomy boundaries (G89, G98).** Ratify that housing jurisdiction ≠ legal jurisdiction, that healing lodges remain attributed to their Indigenous operators, and that immigration (ICE/CBSA) + tribal detention are modeled as distinct regimes — not folded into criminal custody.
6. **US scope phasing (G99–G101).** Confirm the phase-1 states vs. future, and that the US edition ships on the shared engine with no fork.
7. **Repo placement.** Confirm all build slices land in `juge.ca` (not `annoncedenounce.com`); this plan only carries the design.

---

## 4. First safe slice

The smallest correct, reviewable, non-fork increment (ships in `juge.ca`):

> **Public per-facility route + read-only engine seam — no private matters yet.**

1. Extract a country-agnostic `DetentionFacilityView` contract that both `ca.ts` and `us.ts` already satisfy (operator, type, visiting, oversight, jurisdiction tags). Pure refactor, no behavior change.
2. Add a **public, read-only** facility route `app/[lang]/criminal-justice/facility/[slug]` rendering only already-validated registry fields. No detainee data, no private matters, no status — strictly public operator/visiting/oversight info (satisfies G89; trivially satisfies G90 since no personal data is touched).
3. Add a build-time guard that fails the build if a rendered facility references an unvalidated (`–`) seed field (G97), and an assertion that housing jurisdiction is never used as legal jurisdiction (G98).
4. Extend `scripts/eval/judge911-eval.mjs` + `__tests__` with cases pinning G89/G90/G97/G98 for the new route.

This slice is safe because it is public-data-only and additive: it stands up the engine seam and
one navigable route without touching the privilege wall, consent, encryption, or any personal/status
data — all of which are gated on the counsel + security decisions in §3. Private matters, duty-counsel
routing, and US parity follow as separate PRs once those decisions land.

---

## 5. Acceptance gates mapped

| Gate | Meaning | Where enforced |
|------|---------|----------------|
| G87 | Free / accurate / bilingual rights, info not advice | rights-track pages + disclaimer (counsel-approved) |
| G88 | Privilege wall on private matters | encryption + consent primitives (Part V) |
| G89 | Jurisdiction-tagged config | registry + facility routes |
| G90 | No detention-status disclosure | data model + access control invariant |
| G95 | Youth identity protected by default | youth profile wired into workspace |
| G96 | Separate rehabilitative youth custody | no adult co-location routing |
| G97 | No unvalidated (`–`) lists shipped | build-time validation gate |
| G98 | Housing ≠ legal jurisdiction; healing lodges true-to-operator | type assertions + registry attribution |
| G99–G101 | US edition on same engine, no fork; ICE/tribal distinct | shared engine + parity tests |
