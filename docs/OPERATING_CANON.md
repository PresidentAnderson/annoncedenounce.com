# Annonce Denonce Operating Canon

This repository follows the same operating shape as the stronger AXAI/sovereign repos, scaled down for a static launch site.

## Canon Sources

- Product plan: `Annonce Denonce - Full Site Development Plan`
- Delivery workflow: Sovereign Autonomy Pack `1.0.0`
- Reference implementation patterns: `juge.ca`
- Local lock file: `canon.lock.yaml`

## Required Change Procedure

1. Make the smallest coherent change.
2. Run `npm run verify`.
3. For release metadata changes, run `npm run version:bump -- patch`, `minor`, or `major`.
4. Commit with a conventional commit subject.
5. Push to GitHub and let CI repeat the verifier.

## Verification Gates

The local verifier checks:

- package and release metadata stay in lockstep
- the public footer version matches `package.json`
- required static assets exist
- `/api/version` returns commit and release metadata
- the static site can serve key files
- autonomy, CI, bump, and canon files are present
- placeholders do not ship in `index.html`

## Version Policy

`package.json` is the canonical semantic version. `version.json` carries the public release metadata:

- `version`: same value as `package.json`
- `revision`: monotonically increasing release counter
- `lastUpdated`: ISO date of the latest bump
- `channel`: deployment channel

The manual GitHub workflow `Auto Version Bump` runs the same bump script, reruns verification, commits the metadata update, and tags `vX.Y.Z`.

## Sovereign Autonomy Rules

Autonomous agents may work only through issues that have:

- a `priority:*` label
- explicit acceptance criteria
- a PR through the review gate

Changes touching auth, evidence, moderation, legal pages, privacy, right-of-reply, takedown handling, or publication rules require human/legal review before merge. Agents can prepare the work; they do not decide the legal posture.

## Product Safety Principles

The platform is evidence-first, not pile-on-first:

- pre-moderation before publication
- allegation-safe language
- right-of-reply for identifiable parties
- private data minimization
- auditability for decisions and release history
