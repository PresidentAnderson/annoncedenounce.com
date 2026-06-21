# CODEX — Autonomous Execution Instructions

This file is **required** by `.github/workflows/autonomous-agent-loop.yml`: the
loop refuses to start for `agent_name=codex` unless
`AGENTS/CODEX_AUTONOMOUS_INSTRUCTIONS.md` exists. It defines the operational
contract for the loop. The substantive rules live in
[`../AGENTS.md`](../AGENTS.md) and [`../docs/OPERATING_CANON.md`](../docs/OPERATING_CANON.md) —
read those first; this file is the loop-specific checklist.

## Identity

- **Agent name:** `codex`
- **Git author:** `Codex Agent <codex@sovereign-agents.local>`
- **Branch namespace:** `agent/codex/{issue}-{slug}`

## Trigger

Manual only (`workflow_dispatch`). There are no automatic triggers — activity on
a public repo must never drive a write-access loop. Run deliberately:

```bash
gh workflow run autonomous-agent-loop.yml -f agent_name=codex -f max_issues=1
```

## Issue selection contract

Pick the **highest-priority eligible** open issue, in order
`priority:critical` → `priority:high` → `priority:medium`. An issue is eligible
only when it has **both**:

- a `priority:*` label, and
- a `## Acceptance Criteria` section in the body.

`priority:low` issues are not auto-selected. Issues without acceptance criteria
are skipped — comment asking the author to add them.

## Per-issue execution loop

For each selected issue:

1. Classify it against the **conservative gate** in `../AGENTS.md`. If it touches
   auth, evidence, moderation, takedown, right-of-reply, publication rules,
   legal/privacy/consent, money, secrets, CI workflows, or version files →
   **plan-PR only**, no functional change, request human/legal review. Otherwise
   proceed to implement.
2. Create branch `agent/codex/{issue}-{slug}` (lowercase slug from the title).
3. Make the smallest coherent change that satisfies the acceptance criteria.
4. Run `npm run verify` — it **must** pass before pushing.
5. Write `IMPLEMENTATION_{issue}.md` at the repo root mapping the change to each
   acceptance-criteria checkbox. (Never embed the literal `IMPLEMENTATION_<n>`,
   `TODO`, or `placeholder text` tokens inside `index.html`.)
6. Commit (`feat(agent): implement issue #{issue}` … `Closes #{issue}`), push.
7. Open the PR using the body template in `../AGENTS.md` (it must include
   `Agent Handoff Protocol`, `@claude-code`, `Review Checklist`, and
   `Closes #{issue}`), and label it `agent:handoff`.
8. Label the issue `status:pr-created`.

## Hard prohibitions

- **No pushes to `main`** (branch protection blocks it; every change is a PR).
- **No edits to version metadata** (`package.json` version, `version.json`,
  `index.html` version markers) — owned by the Auto Version Bump workflow.
- **No edits to `.github/workflows/**`** without an explicit human-approved issue.
- **No secrets, tokens, or credentials** committed in any form.
- **No scope creep** — one issue, one branch, one focused PR.
- **Do not bypass `npm run verify`** to make a change "pass."

## Stop conditions

The loop stops when: `max_issues` is reached, no eligible issue remains, a
`.agent-workspace/STOP` file is present, or an issue is gated (hand it to a plan
PR and move on). Every PR it opens requires human review before merge.
