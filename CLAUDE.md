# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is ForgeOS

ForgeOS is a containerized, multi-user AI development environment. It runs as a Docker container and exposes a Next.js web UI (port 3000) that serves as a full IDE shell: setup wizard, authentication, terminal (xterm.js over WebSocket/PTY), sidebar, and panel grid. Claude Code and Codex CLI run as subprocesses inside the container.

## Commands

```bash
# Development
npm run dev          # Start custom server (tsx server.ts) with hot reload

# Build (order matters: Prisma → Next.js → server.ts compile)
npm run build        # prisma generate && next build && tsc --project tsconfig.server.json

# Production
npm run start        # node server.js

# Linting
npm run lint         # next lint

# Database
npm run db:generate  # prisma generate (after schema changes)
npm run db:push      # push schema to DB (dev, no migration history)
npm run db:migrate   # prisma migrate dev (creates migration files)
npm run db:studio    # open Prisma Studio GUI
```

## Architecture

### Process Model

The app uses a **custom Node.js HTTP server** (`server.ts` → compiled to `server.js`) instead of `next start`. This is required to co-host Next.js request handling and a WebSocket server on the same port.

- `server.ts` — wraps Next.js with `node-pty` WebSocket PTY support
- WebSocket endpoint: `ws://host/api/terminal?path=<cwd>` — spawns a bash shell via `node-pty`, relays data bidirectionally
- All other requests pass through to Next.js App Router

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Runtime | Custom Node.js HTTP server (`server.ts`) |
| Database | SQLite via Prisma (file at `/root/.forgeos/forgeos.db`) |
| Terminal | xterm.js + `@xterm/addon-fit` + `node-pty` over WebSocket |
| Auth | DB-backed session cookies (`forgeos_session`, 7-day TTL) |
| Styling | Tailwind CSS v4 + CSS custom properties (`--bg`, `--surface`, `--border`, `--accent`, `--muted`, `--text`) |
| Reverse Proxy | Traefik v3 (external, SSL via Let's Encrypt) |

### Key Files

- `server.ts` — custom HTTP+WebSocket server entry point
- `src/lib/db.ts` — Prisma client singleton
- `src/lib/auth.ts` — session creation/validation, `requireAuth()` / `requireAdmin()` guards
- `src/lib/config.ts` — config key/value store backed by `Config` Prisma model
- `prisma/schema.prisma` — User, Session, Invite, Config, Project models
- `next.config.ts` — `serverExternalPackages` for `@prisma/client`, `prisma`, `node-pty`; webpack externals for `node-pty`

### App Router Structure

- `/` — main dashboard (server component, auth-gated, renders `DashboardShell`)
- `/login` — login page
- `/setup` — setup wizard (4 steps: Admin → Git → AI → Project)
- API routes under `src/app/api/` — all use `export const dynamic = "force-dynamic"`

### Dashboard Layout

`DashboardShell` (client component) owns the top-level layout state:
- `activeProject` — currently selected project path
- `orchestrator` — `"claude"` | `"codex"` (passed down to MenuBar and StatusBar)
- `sidebarOpen` — toggleable sidebar

Components: `MenuBar` → `Sidebar` + `PanelGrid` → `StatusBar`

`PanelGrid` renders `TerminalPanel` with the active project path. `TerminalPanel` dynamically imports xterm.js (client-only) and connects via WebSocket.

### Database / Auth

- Sessions are DB-backed (UUID token in cookie, row in `Session` table with `expiresAt`)
- `requireAuth()` and `requireAdmin()` throw on failure — API routes must catch and return 401/403
- First-run setup creates the admin user via `/setup` wizard, which also initializes Git identity, AI provider credentials (Claude + Codex), and the first project

### Docker / Deployment

- Runs as root (current Dockerfile uses `node:24-slim` with no user switching)
- `entrypoint.sh` creates data dirs and runs `prisma db push` on first start if DB doesn't exist
- Named volumes: `forgeos-data` (`/root/.forgeos`), `claude-data` (`/root/.claude`), `ssh-keys`, `gh-config`, `forgeos-workspace` (`/workspace`)
- Requires external `proxy` Docker network for Traefik

### Important Constraints

- `node-pty` is a native module — must be in `serverExternalPackages` and webpack externals; cannot be bundled
- xterm.js CSS must be imported in `src/app/layout.tsx` (not via CSS `@import`) due to Next.js CSS handling
- All App Router pages/routes that use Prisma or other server-only code need `export const dynamic = "force-dynamic"` (no `DATABASE_URL` at build time)
- `npm run build` must run `prisma generate` first to avoid missing Prisma client types

### Open Architecture Decisions

- **D9 (unresolved)**: Claude/Codex subprocess lifecycle — shared process vs. per-project. Currently undecided.
- Phase 2 features still in progress: CodeMirror file editor, AI chat panel, persisted panel layouts, full provider routing execution.

## AI Memory Layers

### Base Knowledge (read on every session — in Git)
The following files contain structured knowledge about ForgeOS:
- `docs/ai-context/forgeos-overview.md` — what ForgeOS is
- `docs/ai-context/architecture.md` — technical architecture
- `docs/ai-context/components.md` — key components and file paths
- `docs/ai-context/decisions.md` — architecture decisions and rationale
- `docs/ai-context/codex-notes.md` — Codex-specific notes

Read these when starting work in this codebase.

### Learned Knowledge (persistent — in Volume, not in Git)
Session insights and user preferences are stored in:
- `/root/.forgeos/ai-memory/MEMORY.md` — index
- `/root/.forgeos/ai-memory/*.md` — individual memory files

This directory may not exist yet on first run — create it if needed.
