# ForgeOS

A containerized, multi-user AI development environment. Run it with Docker, set it up in the browser, start building with Claude Code or Codex.

## What It Is

ForgeOS gives AI assistants (Claude Code, OpenAI Codex) a persistent, browser-accessible workspace with:
- Web-based IDE: terminal, file tree, editor, AI chat panels
- Setup wizard: configure Git, Claude, and Codex auth in minutes
- Multi-user: invite-based access with role management
- Persistent storage: credentials and projects survive container rebuilds

## Requirements

- Docker and Docker Compose
- A reverse proxy (Traefik v3 recommended) for SSL
- One of: Anthropic API key, claude.ai account, OpenAI API key, or OpenAI device flow auth

## Quick Start

```bash
git clone https://github.com/your-org/forgeos.git
cd forgeos
cp .env.example .env
# Edit .env: set DOMAIN, DATABASE_URL, and NEXTAUTH_SECRET
docker compose up -d
```

Open `https://your-domain` in your browser and follow the Setup Wizard.

## Setup Wizard

On first run, the wizard guides you through:
1. **Admin Account** — create the primary administrator
2. **Git Identity** — connect GitHub via Device Flow, Personal Access Token, or SSH key
3. **AI Providers** — configure Claude (API key or claude.ai OAuth) and/or Codex (API key, Device Flow, or Azure OpenAI)
4. **First Project** — optionally clone a repository into `/workspace`

After setup, all configuration is accessible via **Settings** in the user menu.

## Named Volumes (What Persists)

| Volume | Path | Contents |
|--------|------|----------|
| `forgeos-data` | `/root/.forgeos` | Database, AI memory |
| `claude-data` | `/root/.claude` | Claude Code auth |
| `ssh-keys` | `/root/.ssh` | SSH keypair |
| `gh-config` | `/root/.config/gh` | GitHub CLI tokens |
| `forgeos-workspace` | `/workspace` | Project repositories |

All volumes survive `docker compose up --build`. Only `docker compose down -v` removes them.

## Development

```bash
# Clone and install
git clone ... && cd forgeos && npm install

# Generate Prisma client
npm run db:generate

# Run in dev mode (hot reload)
npm run dev

# Build for production
npm run build
npm run start
```

## Project Structure

```
src/
  app/           Next.js App Router pages and API routes
  components/    React components
    layout/      Shell, Sidebar, PanelGrid, MenuBar, etc.
    setup/       Setup wizard steps
    settings/    Settings overlays (shared between wizard + dashboard)
    editor/      CodeMirror viewer/editor
    chat/        AI chat panels
    terminal/    xterm.js terminal
  lib/           Shared utilities (db, auth, config, files)
prisma/          Prisma schema and migrations
docs/
  ai-context/    Base AI knowledge (versioned, for Claude + Codex)
  superpowers/   Design specs and implementation plans
```

## AI Memory

ForgeOS uses a two-layer memory system for AI assistants:

- **Base knowledge** (`docs/ai-context/`) — versioned in Git, updated with `git pull`
- **Learned knowledge** (`/root/.forgeos/ai-memory/`) — in named volume, grows over time

See `CLAUDE.md` and `AGENTS.md` for how Claude and Codex read both layers.
