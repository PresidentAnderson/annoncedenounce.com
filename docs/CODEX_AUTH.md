# Operator Setup: Authenticating Codex

**Policy: subscription-first, API key as fallback/CI only.**

Codex usage is included in eligible ChatGPT/OpenAI plans (Plus, Pro, Business,
Enterprise). Doing the bulk of issue-resolution on your **subscription**
maximizes the monthly fee you already pay; metered API billing should be the
exception (CI and overflow), not the default.

## Two auth modes

### 1. Subscription (uses your ChatGPT plan's included Codex usage) — preferred

```bash
codex login                # opens a browser → "Sign in with ChatGPT"
codex login --device-auth  # headless / remote machine (no browser)
```

- Default auth path when no valid session exists.
- Draws from your plan's included allowance, governed by **rolling ~5-hour
  windows plus weekly caps**.
- The CLI, the Codex web app, and the IDE extension **share the same
  allowance** — a heavy CLI session competes with web sessions.

### 2. API key (metered, pay-per-token) — the "developer setting"

```bash
codex login                # then paste your platform.openai.com API key
```

- Billed per token; no window limits.
- Recommended by OpenAI for **CI/CD and headless** automation.
- In this repo, the GitHub Actions loop uses the `OPENAI_API_KEY` secret for
  exactly this reason.

## Switching, storage, and pinning a mode

```bash
codex logout   # clear cached credentials, then `codex login` to switch mode
```

- Credentials cache at `~/.codex/auth.json` (treat as sensitive — it holds
  access tokens). Use the OS keyring instead with
  `cli_auth_credentials_store = "keyring"`.
- Managed setups can force a method: `forced_login_method = "chatgpt"` (or
  `"api"`) in the Codex config.

## "Drop to API when the subscription is done"

There is **no automatic failover** in the CLI from subscription to API key. When
the included allowance is exhausted, Codex pauses until the window resets. To get
overflow:

- **Pay-as-you-go credits** (account-level) — if your plan supports enabling
  usage-based credits, Codex continues on credits after the included allowance
  runs out. Check your OpenAI billing settings; availability varies by plan.
- **Manual switch** — keep an API key configured and `logout`/`login` into API
  mode when you've burned the window.

## How this maps to this repo's two Codex paths

| Path | Auth | Notes |
|------|------|-------|
| **Real Codex doing issue work** — Codex web app, or `codex` CLI locally (reads [`../AGENTS.md`](../AGENTS.md)) | **Subscription** (`codex login` → ChatGPT) | Where the work — and the value — is. Assigning a GitHub issue to Codex from the web UI already uses your plan. |
| **GitHub Actions loop** (`autonomous-agent-loop.yml`) | **API key** (`OPENAI_API_KEY` secret) | CI is headless; subscription auth there is fragile. The loop is currently a handoff stub that calls no model. |

**Recommendation:** run day-to-day issue-resolution with Codex on your ChatGPT
plan; reserve the API key for CI and for overflow when you exhaust the window.

## Sources

- Authentication — Codex (OpenAI Developers): https://developers.openai.com/codex/auth
- Using Codex with your ChatGPT plan (OpenAI Help Center): https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan
- CLI — Codex (OpenAI Developers): https://developers.openai.com/codex/cli
- Pricing — Codex (OpenAI Developers): https://developers.openai.com/codex/pricing
