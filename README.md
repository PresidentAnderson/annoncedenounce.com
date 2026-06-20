# annoncedenounce.com

> Coming soon landing page with autonomous development capabilities.

## Live Site

**Production:** https://annoncedenounce.com (Vercel alias: https://annoncedenouncecom.vercel.app)

## Tech Stack

- Static HTML/CSS landing page
- HubSpot launch form (Portal ID: 43986063), loaded only after cookie consent, with a first-party email fallback
- Vercel hosting with auto-deploy, security headers (CSP/HSTS), asset caching, and clean URLs
- Privacy policy (`/privacy`), robots.txt, sitemap.xml, web manifest, JSON-LD, OG/Twitter cards
- Vercel Web Analytics + Speed Insights (cookieless)
- Lightweight CI, version governance, and release bump automation

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

## Verification & Releases

Run the local gate before every commit:

```bash
npm ci
npm run verify
```

The verifier checks version metadata, key static assets, the `/api/version` handler, workflow/canon files, and local static serving.

Version metadata is controlled by:

- `package.json` — canonical semver
- `version.json` — public release metadata and revision counter
- `index.html` — visible footer version

To bump locally:

```bash
npm run version:bump -- patch
npm run version:bump -- minor
npm run version:bump -- major
```

To bump through GitHub Actions, run the **Auto Version Bump** workflow manually. It updates metadata, reruns verification, commits the release bump, and pushes a `vX.Y.Z` tag.

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
├── index.html              # Landing page (consent-gated HubSpot form, a11y, SEO meta)
├── privacy.html            # Privacy policy (/privacy) — Loi 25 / RGPD
├── robots.txt              # Crawler directives + sitemap reference
├── sitemap.xml             # Canonical URL sitemap
├── site.webmanifest        # PWA / install metadata
├── package.json            # Scripts and canonical version
├── package-lock.json       # Reproducible npm install
├── version.json            # Release revision metadata
├── assets/
│   ├── favicon.png         # Site icon
│   └── hero-dossier.png    # Local hero visual
├── api/
│   └── version.js          # Vercel version endpoint
├── scripts/
│   ├── bump-version.mjs    # Semver + revision bump
│   └── verify-site.mjs     # Static site verification gate
├── docs/
│   └── OPERATING_CANON.md  # Repo operating procedure
├── canon.lock.yaml         # Canon/source lock
├── vercel.json             # Vercel config
├── autonomy.defaults.yml   # Agent configuration
├── Makefile                # Autonomy commands
└── .github/
    └── workflows/
        ├── ci.yml                         # Verification workflow
        ├── auto-version-bump.yml          # Manual release bump
        ├── autonomous-agent-loop.yml      # Main agent workflow
        └── autonomy-pr-review-gate.yml    # PR review automation
```

## Lead Capture

The HubSpot form (Portal ID `43986063`) is loaded **only after the visitor accepts cookies** (Loi 25 / RGPD). Before consent — or if the visitor declines — the page shows a first-party email fallback to `contact@annoncedenounce.com` that sets no cookies and loads no third-party script.

**Before launch you must replace `HUBSPOT_FORM_ID` in `index.html`** (currently `waitlist-annoncedenouncecom`) with the real form GUID from the HubSpot form editor, then submit a live test through production.

## Pre-Launch Checklist

Code-side hardening (security headers, robots/sitemap, consent gate, a11y focus states, SEO meta, CI safety) ships in this repo. The remaining go-live steps require dashboard/account access:

1. **HubSpot:** replace `HUBSPOT_FORM_ID` with the real GUID; submit a test entry into portal `43986063`.
2. **Vercel → Domains:** add `www.annoncedenounce.com` as a 308 redirect to the apex (auto-provisions its SSL cert).
3. **Vercel → Analytics:** enable Web Analytics and Speed Insights (the page already includes the scripts).
4. **Legal:** have a lawyer review `/privacy` (`privacy.html`) and confirm the bracketed `[…]` items (legal entity, retention periods).
5. **Vercel → Git:** keep branch protection on `main` so the autonomous loop can't push directly; the loop is now manual-only (`workflow_dispatch`).

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
