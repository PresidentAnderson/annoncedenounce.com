# annoncedenounce.com

> Coming soon landing page with autonomous development capabilities.

## Live Site

**Vercel:** https://annoncedenounce-com.vercel.app

## Tech Stack

- Static HTML/CSS landing page
- HubSpot-ready launch form (Portal ID: 43986063) with mail fallback
- Vercel hosting with auto-deploy
- Sovereign Autonomy Pack for AI-powered development

## Autonomous Development

This repo is powered by the **Sovereign Autonomy Pack** - enabling AI agents to process issues and implement features automatically.

### Quick Commands

```bash
# Run Codex agent on issues
make autonomy.run agent=codex max_issues=3

# Run Claude agent (strategic)
make autonomy.run agent=claude max_issues=1

# View help
make autonomy.help
```

### Manual Trigger

```bash
gh workflow run autonomous-agent-loop.yml -f agent_name=codex -f max_issues=1
```

### Required Secrets

Add these to repo Settings → Secrets → Actions:

| Secret | Description |
|--------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for Codex agent |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude agent |

## Project Structure

```
├── index.html              # Landing page
├── assets/
│   ├── favicon.png         # Site icon
│   └── hero-dossier.png    # Local hero visual
├── vercel.json             # Vercel config
├── autonomy.defaults.yml   # Agent configuration
├── Makefile                # Autonomy commands
└── .github/
    └── workflows/
        ├── autonomous-agent-loop.yml      # Main agent workflow
        └── autonomy-pr-review-gate.yml    # PR review automation
```

## Lead Capture

The launch page attempts to load a HubSpot form for Portal ID `43986063`. If the embedded form is unavailable, the page shows a direct email fallback to `contact@annoncedenounce.com`.

Before launch, confirm the HubSpot `formId` in `index.html` matches the production form GUID.

## Deployment

Auto-deploys to Vercel on push to `main` branch.

## Custom Domain

To add custom domain:
1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add `annoncedenounce.com`
3. Update DNS records as instructed

---

**Powered by [Sovereign Autonomy Pack](https://github.com/PresidentAnderson/sovereign-autonomy-pack)**

© 2026 AXAI Innovations
