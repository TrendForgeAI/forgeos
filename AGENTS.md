# AGENTS.md — ForgeOS Context for Codex

This file is the Codex equivalent of CLAUDE.md. Read it at the start of every session.

## Project
ForgeOS — containerized multi-user AI development environment.
See `docs/ai-context/forgeos-overview.md` for full overview.

## Essential Reading
- `docs/ai-context/architecture.md` — tech stack, volumes, credential storage
- `docs/ai-context/components.md` — components, API routes, file paths
- `docs/ai-context/decisions.md` — why things are built the way they are
- `docs/ai-context/codex-notes.md` — Codex-specific notes and quirks

## Commands
- `npm run dev` — development server with hot reload
- `npm run build` — production build (prisma generate + next build + tsc)
- `npm run db:generate` — regenerate Prisma client after schema changes

## Persistent Memory
Check `/root/.forgeos/ai-memory/MEMORY.md` for session learnings (if it exists).
Add new learnings there after significant discoveries or decisions.
