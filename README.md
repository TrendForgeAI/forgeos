# ForgeOS

A containerized, multi-user AI development environment.  
Deploy from a Git repo, run the setup wizard in your browser, start building.

## What is ForgeOS?

ForgeOS is a self-hosted platform that combines:
- **Web-based terminal** — full PTY access in the browser
- **AI chat panel** — streaming chat with Claude or Codex, next to the terminal
- **File editor** — CodeMirror 6 editor with syntax highlighting, opened from the file tree
- **AI coding agents** — Claude Code and Codex, per project, per-subprocess
- **Multi-user** — invite-based access, role-based permissions (admin/user)
- **Provider routing** — route tasks to the right model automatically
- **Persistent storage** — credentials and projects survive container rebuilds

## Requirements

- Docker + Docker Compose
- A domain with DNS pointing to your server (or use `localhost` for local dev)
- [Traefik v3](https://traefik.io) running as reverse proxy (external Docker network `proxy`)

## Quickstart

```bash
# 1. Clone
git clone https://github.com/TrendForgeAI/forgeos.git
cd forgeos

# 2. Configure
cp .env.example .env
# Edit .env: set DOMAIN and SESSION_SECRET (required)

# 3. Start
docker compose up -d

# 4. Open browser
open https://your-domain.com
# → Setup wizard guides you through the rest
```

## Setup Wizard

On first boot the wizard collects:

1. **Admin account** — email + password (min 12 chars)
2. **Git identity** — name + email + optional GitHub OAuth (device flow)
3. **AI providers** — Anthropic API key and/or OpenAI API key (both optional, configurable later)
4. **First project** — optional Git repo to clone into `/workspace`

## Inviting Users

After setup, admins can invite users from the dashboard:
- Settings → Users → Enter email → Copy invite link
- Invite links are single-use and expire after 48 hours

## Named Volumes (What Persists)

| Volume | Path | Contents |
|--------|------|----------|
| `forgeos-data` | `/root/.forgeos` | Database, AI memory |
| `claude-data` | `/root/.claude` | Claude Code auth |
| `ssh-keys` | `/root/.ssh` | SSH keypair |
| `gh-config` | `/root/.config/gh` | GitHub CLI tokens |
| `forgeos-workspace` | `/workspace` | Project repositories |

All volumes survive `docker compose up --build`. Only `docker compose down -v` removes them.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 24 LTS |
| Web Framework | Next.js 15 (App Router) |
| Database | SQLite + Prisma |
| AI — Primary | Claude Code (Anthropic) |
| AI — Secondary | Codex (OpenAI) |
| Container | Docker + Docker Compose |
| Reverse Proxy | Traefik v3 (external) |

## Local Development

```bash
# Install dependencies
npm install

# Set up local environment
cp .env.example .env
# Set DATABASE_URL=file:./dev.db in .env

# Initialize database
npx prisma db push

# Start dev server
npm run dev
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

## License

MIT
