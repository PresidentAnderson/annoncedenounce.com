# Issue #440 — Audit "coming soon" provider/service states (child of #416)

> Status: **Plan / blocked-on-repo-mismatch.** Refs #440.
> This plan is shipped from the `annoncedenounce.com` worktree because that is
> the repository this autonomy run was given. The actual code that issue #440
> targets lives in a **different repository — `PresidentAnderson/juge.ca`** — so
> the implementation cannot be applied here. See "Blocker" below. The plan is
> written to be directly executable by whoever next runs in the `juge.ca` repo.

## Blocker (why this is a plan, not an implementation)

- Issue #440 (`gh issue view 440`) resolves only in `PresidentAnderson/juge.ca`.
  It does not exist in `PresidentAnderson/annoncedenounce.com` (which has a
  single issue, #1).
- The run's own setup symlinks `node_modules` to `…/juge.ca/node_modules`, and
  the issue/parent reference `components/marketplace/ServiceFunnel.tsx` — files
  that exist in `juge.ca`, not in this `annoncedenounce.com` static-site
  worktree (this repo is `index.html` + `privacy.html` + `api/` + `assets/`,
  with no React/TypeScript app, no `tsconfig.json`, no marketplace).
- Hard rule: stay in MY worktree (a checkout of `annoncedenounce.com`) and never
  touch another repo's branch. `juge.ca` has its own autonomy loop. So the safe
  action is to carry the audit + decision plan as a PR here (per the fallback
  rule) rather than edit the wrong repo or reach into a sibling worktree.

## Scope (from the issue)

> Part of #416. "Coming soon" audit. [A]
> - Enumerate all provider/service "coming soon" states; for each, implement OR
>   intentionally hide for beta.
>
> Acceptance: a documented list with a decision per item; nothing accidental
> ships to beta.

This is an **audit-and-decide** task, not primarily a build task. The
deliverable the issue asks for is "a documented list with a decision per item".

## Audit — "coming soon" provider/service states found in `juge.ca`

Grounded in a grep of the `juge.ca` working tree (`grep -rin "coming soon|coming-soon|comingSoon|bientôt|à venir"`), restricted to provider/service/marketplace surfaces (locked **lifecycle modules** are the sibling issue #441 and are out of scope here except where they overlap):

| # | Location | State today | Trigger / condition | Proposed decision for beta |
|---|----------|-------------|---------------------|----------------------------|
| 1 | `components/marketplace/ServiceFunnel.tsx` (~L123-147) | "Bientôt disponible" / "Coming soon" CTA panel with `NotifyMeForm` instead of a checkout button | `isGatedOpsKind(kind) && !evaluateOpsKindCheckout(...).allowed` — regulated lanes (`lawyer`/`expert`) whose counsel/compliance flag is OFF | **Keep — intentional & well-built.** Already a deliberate gated state mirroring the `/api/ops/checkout` 423 gate; no dead end (collects email). Verify copy + that the gate predicate matches the API exactly. No flag flips. |
| 2 | `components/marketplace/ProviderSelectionStep.tsx` (~L193-194) | "Providers coming soon for this service. Check back shortly or request a quote below." | `matching.length === 0` — service is mapped to a provider type but the directory has none yet | **Keep — intentional.** Graceful empty-state, points the user to the quote path. Confirm every catalogued service either has bookable providers OR cleanly degrades to quote, so no service shows a true dead end in beta. |
| 3 | `components/marketplace/ProviderSelectionStep.tsx` (~L205) | "Providers are being verified — you can still place your order…" | `matching.every((p) => !isBookable(p))` — providers exist but none verified | **Keep — intentional bridging state.** Confirm an unverified-only service still has a working order/quote downstream path (no 423/dead end). |
| 4 | Marketplace page notice (`dictionaries/en.ts` / `fr.ts`, "build in progress — coming soon", profiles/pricing/reviews illustrative) | Permanent banner declaring marketplace illustrative during build | Always-on during beta | **Keep — intentional & required for compliance/expectation-setting.** Must remain until the marketplace is genuinely live; do not silently remove. Verify it renders on every marketplace surface. |
| 5 | `app/[lang]/design-system/page.tsx` (~L52) | node status `live` vs `à venir`/`planned` badge | `n.status !== "live"` | **Keep — internal/dev surface.** Confirm `design-system` route is not linked from the public beta nav (it is a dev reference page). If reachable by beta users, hide behind a flag. |
| 6 | `dictionaries/*` `comingSoon` token (e.g. `en.ts` `comingSoon: "Now live"`) | i18n string currently repurposed to "Now live"/"En ligne maintenant" | Used by home badge | **Verify, likely keep.** The token value already reads "Now live", so it is not surfacing a stale "coming soon" — confirm no caller renders a literal "coming soon" from it. Edition-purity check on any copy touched. |

Out of scope here (other #416 children): locked **lifecycle modules** in
`components/workspace/Lifecycle.tsx` ("Module à venir" / "Coming soon") → issue
#441. ServiceFunnel checkout TODO at `ServiceFunnel.tsx:97` → issue #439/#383.

## Concrete sub-task checklist (to run in `juge.ca`)

- [ ] Re-run the grep to confirm the list is current; add any new hits to the table.
- [ ] For item 1: assert the funnel's gate predicate is byte-for-byte the same
      condition as `/api/ops/checkout` (so UI never shows a CTA the API 423s).
      No `enabled`/flag flips — read-only verification + copy polish only.
- [ ] For items 2 & 3: walk each catalogued `OpsService` (`lib/litigation/ops-catalog.ts`)
      and confirm the empty-provider / unverified-provider branches all lead to a
      working quote or order path — no dead ends, no 423 surprises.
- [ ] For item 4: confirm the "build in progress" marketplace banner renders on
      every marketplace entry surface; keep it. Do not remove or weaken.
- [ ] For item 5: confirm `design-system` is dev-only / unlinked from beta nav;
      flag-hide if reachable.
- [ ] For item 6: confirm no caller renders a literal stale "coming soon" from
      the `comingSoon` dictionary token.
- [ ] Edition-purity pass on any funnel copy touched (no cross-jurisdiction leak;
      US vs QC terminology stays correct via `opsServices()` overrides).
- [ ] Record the final decision-per-item table in the `juge.ca` PR body to satisfy
      the acceptance criterion ("a documented list with a decision per item").
- [ ] Run `node_modules/.bin/tsc --noEmit` and `npm run check:locales` in `juge.ca`;
      add no new type/locale errors in touched files.

## Human / architecture / counsel decisions required

- **[H/counsel]** The regulated `lawyer`/`expert` checkout gate (item 1) stays
  OFF until counsel/compliance flips it. An agent must NOT flip those flags or
  attestations. Confirm the gated "coming soon" is the desired beta behavior.
- **[H/architecture]** Item 4: confirm the marketplace "build in progress" banner
  policy for beta (keep vs. scope-down). This is an expectation-setting/compliance
  call, not an agent decision.
- **[H]** Confirm `design-system` (item 5) is intentionally not part of beta nav.

## First safe slice

Items 2 & 3 in `juge.ca`: an audit-only verification that every catalogued
`OpsService` degrades gracefully (provider directory empty → quote path;
unverified-only → order-with-assignment path) with **no code/flag changes** —
purely confirming no service reaches beta with an accidental dead end, and
recording the result in the table. This carries zero monetization/compliance
risk and directly advances the acceptance criterion. Any copy polish that follows
gets the edition-purity check.

## Note for the orchestrator

To actually implement #440, target the `PresidentAnderson/juge.ca` repository
(where `components/marketplace/ServiceFunnel.tsx` and the ops catalogue live),
not `annoncedenounce.com`. This plan PR exists so the issue is not left without a
PR; it makes no code changes to the marketplace.
