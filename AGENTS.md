# AGENTS.md — Instructions for Codex (and other coding agents)

This file tells an autonomous coding agent (OpenAI Codex, and the repo's
`agent_name=codex` loop) how to work safely in this repository. Read it fully
before touching anything. The binding rules live in
[`docs/OPERATING_CANON.md`](docs/OPERATING_CANON.md); this file is the practical
how-to that sits on top of the canon. If the two ever disagree, the canon wins.

## What this repo is

`annoncedenounce.com` — a **static HTML/CSS launch site** (no app framework
build step) hosted on Vercel. Primary language is **French (`fr`)**, secondary
is **English (`en`)** (Quebec / Loi 25). The product is **evidence-first, not
pile-on-first**: pre-moderation before publication, allegation-safe language,
right-of-reply for identifiable parties, data minimization, auditability.

Key files: `index.html` (the site, `<html lang="fr">`), `privacy.html`,
`robots.txt`, `sitemap.xml`, `site.webmanifest`, `vercel.json` (security
headers/CSP), `api/version.js`, `package.json` + `version.json` (release
metadata), `scripts/verify-site.mjs` (the gate), `docs/OPERATING_CANON.md`.

## The five golden rules

1. **Only work eligible issues.** An issue is eligible only if it has a
   `priority:*` label **and** a `## Acceptance Criteria` section. If either is
   missing, do not implement — comment asking for them, and stop.
2. **Never touch version metadata.** `package.json` `version`, `version.json`,
   and the version markers in `index.html` are owned by the **Auto Version
   Bump** workflow / `npm run version:bump`. Do not hand-edit them, ever.
3. **`npm run verify` must pass** before you open a PR. It is the same check CI
   runs ("Verify static site and operating canon"). Green local verify = green CI.
4. **Never push to `main`.** Branch protection blocks it. Every change is a PR.
   All agent PRs require human review before merge.
5. **Smallest coherent change.** One issue → one branch → one focused PR. Do not
   refactor adjacent code, reformat unrelated files, or expand scope.

## What you may resolve autonomously vs. plan-PR only

**Conservative posture (this repo's default).**

You **may implement and open a normal handoff PR** for issues scoped to:

- site copy, markup, and layout on the static pages
- SEO (metadata, JSON-LD, sitemap/robots), accessibility, performance
- documentation
- straightforward bug fixes that don't touch the areas below

For anything touching these areas, **do not implement the behavior** — open a
**plan-only PR** (a markdown plan + acceptance-criteria mapping, no functional
change) and request human/legal sign-off. The canon reserves the legal posture
for humans:

- authentication / accounts
- evidence handling, moderation, takedown, right-of-reply, publication rules
- legal pages, privacy, consent, data handling (Loi 25)
- anything that moves money or touches payment/Stripe flows
- secrets, tokens, credentials
- CI/CD workflows under `.github/workflows/` and the version/release files

When in doubt, treat it as gated and open a plan PR. It is always correct to
ask rather than to decide the legal or release posture.

## How to deliver a change (the handoff protocol the review gate enforces)

The **Autonomy PR Review Gate** (`.github/workflows/autonomy-pr-review-gate.yml`)
will **fail your PR** unless you follow this exactly:

1. **Branch name** must match `agent/codex/{issue}-{slug}` — lowercase, e.g.
   `agent/codex/42-fix-fr-footer-copy`. Regex: `^agent/codex/[0-9]+-[a-z0-9-]+$`.
2. **Add an `IMPLEMENTATION_{issue}.md`** file at the repo root summarizing what
   you changed and how it maps to the acceptance criteria. (The gate checks this
   file exists. Do **not** put the literal token `IMPLEMENTATION_<n>` or
   `TODO`/`placeholder text` inside `index.html` — verify rejects that.)
3. **PR title:** `feat(agent): implement issue #{issue}` (or `fix(agent): …`).
4. **PR body must contain all of:**
   - a section titled **`Agent Handoff Protocol`**
   - a **`@claude-code`** handoff mention
   - a **`Review Checklist`** section
   - a **`Closes #{issue}`** line
5. **Label** the PR `agent:handoff`.

PR body template:

```markdown
## Summary
<what changed, in one or two sentences>

### Agent Handoff Protocol
@claude-code: Agent handoff complete. Please review and approve for merge.

### Review Checklist
- [ ] Implementation addresses the acceptance criteria
- [ ] `npm run verify` passes
- [ ] No security/legal/version-governance lines crossed (see AGENTS.md)
- [ ] fr/en copy parity preserved; site stays `lang="fr"`

Closes #{issue}
```

The gate also runs a security scan (flags hardcoded credentials and dangerous
commands in the diff) and adds `agent:validated` / `review:claude-required`.

## Local workflow

```bash
npm ci
# ...make the smallest change...
npm run verify          # MUST pass — static-site + operating-canon checks
git checkout -b agent/codex/{issue}-{slug}
git add -A && git commit -m "feat(agent): implement issue #{issue}

Closes #{issue}"
git push -u origin agent/codex/{issue}-{slug}
# open the PR with the body template above, label agent:handoff
```

What `npm run verify` enforces (so you don't surprise CI): `package.json` and
`version.json` stay in lockstep; the footer version matches `package.json`;
`index.html` keeps the doctype, `lang="fr"`, contact/fallback/consent sections,
Twitter card, JSON-LD, and manifest link, and ships **no** placeholders or
English version-banner copy; `robots.txt`/`sitemap.xml` reference the canonical
domain; `vercel.json` sets a CSP header; required assets and workflow files
exist; `/api/version` returns the package version.

## Running the autonomy loop as Codex

The loop is **manual-only**:

```bash
gh workflow run autonomous-agent-loop.yml -f agent_name=codex -f max_issues=1
# or, once the Makefile exists:  make autonomy.run agent=codex max_issues=1
```

It processes the highest-priority eligible issue (`critical` → `high` →
`medium`), opens a handoff branch/PR, and labels the issue `status:pr-created`.
It does **not** decide legal posture — gated work must stop at a plan PR.

## If you get stuck

Comment on the issue describing the blocker, what you tried, and what you'd need
to proceed. Do not force a change through, do not widen scope, and do not bypass
the verify gate or version governance to make something pass.
