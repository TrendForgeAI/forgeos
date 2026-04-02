# ForgeOS — Architecture Decisions

## ADR-001: Custom server instead of next start
Custom `server.ts` required to co-host Next.js + WebSocket (node-pty) on the same port.
node-pty must be in `serverExternalPackages` and webpack externals — cannot be bundled.

## ADR-002: SQLite for DB
Single-container setup, no external DB dependency. Prisma handles schema migrations.
DB file in named volume → survives rebuilds.

## ADR-003: Named volumes for all persistent data
Everything that must survive `docker compose up --build` lives in a named volume.
`docker compose down -v` intentionally wipes everything (full reset).

## ADR-004: Config table for credentials
All credentials (API keys, auth tokens) go in the `Config` table as key/value pairs.
No separate secrets manager needed for single-host deployment.

## ADR-005: Tab-group panel system
PanelGrid supports layouts: single | split-h | split-v.
Each group has tabs (terminal, chat-claude, chat-codex, editor, viewer).
Layout persisted in localStorage (key: forgeos_layout_v1).
Two independent groups max — covers 95% of use cases without drag-and-drop complexity.

## ADR-006: Two-layer AI memory
Base knowledge: /app/docs/ai-context/ (in Git, versioned, updated with git pull)
Learned knowledge: /root/.forgeos/ai-memory/ (in Volume, never touched by git)
Both referenced from CLAUDE.md and AGENTS.md.

## ADR-007: File operations scoped to /app and /workspace
API routes for file read/write/delete validate that paths start with /app or /workspace.
This prevents directory traversal attacks.

## ADR-008: Setup wizard is one-time
After first admin creation, /setup redirects to /login. All reconfiguration via Settings overlay.
Setup API routes return 410 Gone after completion.
