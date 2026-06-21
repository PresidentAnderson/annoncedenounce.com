# Plan — Issue #57: [config] Enable CSAM safety workflow

**Status:** PLAN (cross-repo + legal-posture blocker — see "Why this is a plan, not an implementation").
**Source issue (as routed to this worktree):** `[config] Enable CSAM safety workflow`.
**Acceptance (inferred):** the platform that accepts user-submitted media has an
enabled, documented CSAM-detection-and-reporting workflow — hash-matching of uploaded
imagery, blocking/quarantine on a hit, and mandatory reporting to the relevant authority
(NCMEC in the US; in Canada, Cybertip.ca / the operator's `An Act respecting the
mandatory reporting of Internet child pornography` obligations) — wired into moderation.

---

## Why this is a plan, not an implementation

Two independent blockers make a code merge in this worktree the wrong move:

1. **Wrong repo / no upload surface here.** The orchestrator placed this task in the
   **`annoncedenounce.com`** worktree, which is a **static launch site**
   (`index.html`, `privacy.html`, a small `scripts/` of site helpers, governance
   workflows). It has **no user uploads, no media storage, no moderation queue, no
   backend, no database**. A CSAM safety workflow has nothing to act on here — there is
   no upload path to scan and no submission to quarantine or report. The platform that
   actually ingests evidence/media is **`juge.ca`** (Supabase Postgres, the `evidence`
   storage bucket, the moderation/pre-publication pipeline). The shared `node_modules`
   symlink points at `juge.ca`, confirming juge.ca is the intended implementation
   codebase — but a git PR from this worktree can only land in `annoncedenounce.com`.
   Shipping CSAM-scanning code here would put a non-functional feature in the wrong repo,
   violating the "touch only files relevant to this issue" rule. Writing directly into
   the separate live `juge.ca` checkout is out of scope (separate working copy, its own
   autonomy loop).

2. **Legal posture — explicitly human-gated by canon.** `docs/OPERATING_CANON.md` states:
   *"Changes touching auth, evidence, moderation, legal pages, privacy, right-of-reply,
   takedown handling, or publication rules require human/legal review before merge.
   Agents can prepare the work; they do not decide the legal posture."* A CSAM workflow
   is squarely **evidence + moderation + takedown + mandatory-reporting** — the most
   legally loaded path on the platform. Choosing the detector, the reporting destination,
   data-retention/escrow for matched material, the preservation-vs-deletion duty, and the
   law-enforcement contact channel are **counsel decisions**, not engineering defaults.
   This also sits behind the HARD RULE never to flip compliance gate flags/attestations.

Therefore this PR carries a **complete, drop-in implementation plan** so a maintainer can
apply it to `juge.ca` after counsel sign-off, and so the issue has an associated PR. It
uses `Refs #57` (this repo) and is annotated for the juge.ca change it describes.

---

## Scope

In scope (for the `juge.ca` change this plan describes):

- One CSAM-scan step in the upload/moderation ingestion path: every newly uploaded image
  is hashed and matched **before** it can be served or pre-moderation-approved.
- A "hit" path: hard-block + quarantine the asset, freeze the submission, suppress it
  from all human moderator surfaces (do not redisplay suspected CSAM to staff), open a
  high-severity incident, and route to the mandatory-reporting handler.
- A mandatory-reporting handler **stub with a human approval gate** (see Decisions): it
  records the obligation and the evidence-preservation requirement; it does **not**
  auto-fire an external report until counsel approves the destination and format.
- Config to **enable/disable** the workflow (a CI/ops "config" toggle, defaulting to the
  conservative posture once wired) plus the secrets/credentials the detector needs.
- Audit-chain entries for every scan, hit, quarantine, and report action.
- Docs: a `docs/CSAM_SAFETY_WORKFLOW.md` runbook (operator obligations, who is notified,
  retention/preservation rules, escalation contacts).

Out of scope: deciding the legal reporting destination/format; building the actual
external report transport; any change to RLS, legal-hold, or existing publication rules
beyond the new block path; scanning non-image media (note it, phase 2); CI scheduling of
re-scans of historical assets (phase 2, needs a legal-hold-aware backfill plan).

---

## Sub-task checklist (for the juge.ca implementation)

- [ ] Decide and provision the detector (Decision D1). Likely PhotoDNA (Microsoft) or
      an equivalent hash-matching service; store credentials as secrets, never in code.
- [ ] Add a scan module `scripts/`/`lib/` helper (match existing juge.ca conventions:
      `loadEnvFile()`, skip-cleanly-when-credentials-absent, never log image bytes or
      connection strings) that takes an uploaded object and returns `{match: bool, id}`.
- [ ] Wire the scan into the upload handler so it runs **before** the asset is readable
      by moderators or stored in the servable bucket path (scan a quarantine staging
      copy first; promote only on a clean result).
- [ ] Hit path: set the asset/submission state to `quarantined`, remove it from every
      moderator-visible query, and write an `audit_chain_events` entry. Suspected CSAM
      must never be re-rendered to staff.
- [ ] Mandatory-reporting handler **with human approval gate**: persist the obligation,
      the preservation requirement, and a dated, append-only record; emit a
      high-severity alert to the designated human. **No external auto-send** until D2/D3
      are resolved by counsel.
- [ ] Preservation: ensure quarantined material is retained per legal duty (not deleted
      by normal cleanup) and access-restricted; reconcile with existing `legal_holds`.
- [ ] Config toggle (the "config" in the issue title): an env/ops flag to enable the
      workflow, defaulting to the conservative posture once the path is verified; document
      the flag and that disabling it is itself a counsel-reviewed action.
- [ ] Tests: clean-image passes; a synthetic "known-hash" fixture triggers block +
      quarantine + audit entry + alert, and is never returned to moderator queries.
- [ ] Docs: add `docs/CSAM_SAFETY_WORKFLOW.md`; cross-link from the moderation runbook.
- [ ] Validate in juge.ca: `node_modules/.bin/tsc --noEmit` adds no new errors; run the
      block-path test; record the enablement (date + detector + reporting destination)
      after counsel sign-off.

---

## Human / architecture / counsel decisions required (must precede code)

- **D1 (architecture + procurement):** which detector / hash database (e.g. PhotoDNA,
  NCMEC hash list access, or a vendor)? This determines credentials, data-residency, and
  contractual obligations. Cannot be defaulted by an agent.
- **D2 (counsel):** the **reporting destination and legal regime**. US operators report
  to NCMEC (CyberTipline) under 18 U.S.C. §2258A; a Canadian operator has obligations
  under the federal mandatory-reporting act / Cybertip.ca. The operator's jurisdiction(s)
  and the exact destination/format are legal calls.
- **D3 (counsel):** **preservation vs. deletion** of matched material, retention period,
  who may access it, and the law-enforcement contact/escrow channel. Mishandling here has
  criminal exposure — this is the single most important non-engineering decision.
- **D4 (human):** the on-call human who receives the high-severity alert and authorizes
  the external report; their SLA.
- **D5 (compliance):** confirm enabling this satisfies (and is consistent with) any
  existing compliance gate flags/attestations — per HARD RULES an agent must not flip
  these; counsel/owner does.

---

## First safe slice (what can ship immediately, no legal posture decided)

In `juge.ca`, the smallest correct first step that takes **zero** legal posture:

1. Add the **quarantine-first ingestion plumbing** and the `audit_chain_events` wiring,
   plus the **disabled-by-default config flag** and a **stubbed scan that always returns
   "clean" until a detector is provisioned** — so the code path, the block branch, the
   audit entries, and the "never re-show to staff" guarantee are all in place and tested
   behind a flag.
2. Add `docs/CSAM_SAFETY_WORKFLOW.md` capturing D1–D5 as open decisions and the operator
   obligations, so counsel has a concrete artifact to fill in.

This delivers the *mechanism* (safe to merge: it changes no legal posture and reports
nothing externally) while the *policy* (detector choice, reporting destination,
preservation duty, approval SLA) is resolved by the humans named in D1–D5. The workflow
is then "enabled" by setting the flag once D1–D3 are signed off — that flag flip is the
counsel-reviewed action, not an agent default.

---

## Validation for this repo (annoncedenounce.com)

No-op for this repo's build: static site, no `tsconfig.json` (so `tsc` is N/A), no
locales or assets touched. Only `docs/plans/issue-57.md` is added.
