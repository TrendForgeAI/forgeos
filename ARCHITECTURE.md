# ForgeOS — Architecture Concept v2

## Vision

ForgeOS ist eine containerisierte, Multi-User KI-Entwicklungsumgebung.
Deploy from a Git repo, run a setup wizard in the browser, start building.
Everything transparent, everything understood.

---

## Principles

- **Repo = Deployment**: Clone or paste URL → `docker compose up` → Wizard → Ready
- **No secrets in Git**: All credentials via Setup Wizard → config in volume
- **Transparent over convenient**: Every decision traceable, no black boxes
- **Understand before implementing**: Architecture first, code second
- **Multi-provider**: Claude Code primary, other AI runtimes pluggable

---

## Tech Stack

| Layer          | Technology                    | Rationale                                |
|----------------|-------------------------------|------------------------------------------|
| Container Base | Node.js 24 LTS Slim          | Runtime for Next.js + Claude Code        |
| Web Framework  | Next.js 15 (App Router)       | Wizard + Web-UI, one codebase, one port  |
| Database       | SQLite + Prisma               | Users, sessions, projects, config        |
| AI Runtime     | Claude Code (primary)         | Via Web-UI (primary) + SSH (fallback)    |
| AI Runtime 2   | Codex CLI (secondary)         | OpenAI-based coding agent                |
| AI Skills      | Superpowers                   | Agent workflow framework                 |
| Version Control| Git + GitHub CLI              | Device Flow OAuth for headless auth      |
| Reverse Proxy  | Traefik v3 (external)         | SSL via Let's Encrypt                    |
| Container Mgmt | Docker Compose                | Deployable via Dockge / CLI / URL        |

---

## Container Architecture

### User Model

The container runs as root user. This allows Claude Code and other tools to
operate without permission restrictions. All data directories are owned by root.

- Container starts with `node:24-slim` default user (root)
- Entrypoint creates data directories at startup
- All credentials and projects are stored in volumes mounted at `/root`

### Process Model

- Next.js is the main process (port 3000), managed by Traefik
- Claude Code and Codex run as subprocesses started per project
- SSH fallback via `docker exec -it forgeos /bin/bash` always available

### Named Volumes

| Volume              | Mount Point              | Contents                          |
|---------------------|--------------------------|-----------------------------------|
| `forgeos-data`      | `/root/.forgeos`   | SQLite DB, config                 |
| `claude-data`       | `/root/.claude`    | Claude Code credentials           |
| `ssh-keys`          | `/root/.ssh`       | SSH keypair                       |
| `gh-config`         | `/root/.config/gh` | GitHub CLI auth tokens            |
| `forgeos-workspace` | `/workspace`             | Project repos                     |

---

## Rollout Phases

> **Status 2026-04-02**: All phases reset to undone for fresh implementation.
> Check each item against actual code before marking complete.

---

### Phase 1: Container + Wizard + Auth

**Implemented:**
- [x] Dockerfile (Node.js 24 Slim, root user, Claude Code, Codex, gh)
- [x] docker-compose.yaml (named volumes, Traefik labels)
- [x] Single entrypoint.sh with setup validation
- [x] Next.js project skeleton
- [x] SQLite schema (users, projects, sessions, config) via Prisma
- [x] Basic dashboard shell
- [x] README.md + SETUP.md

**In Progress:**
- [x] Auth system complete (invite workflow, session management, revoke flows)
- [x] Setup Wizard with device-flow automation for all providers

**Planned:**
- [ ] Fully automated OAuth/device-flow polling and callback handling
- [ ] Invite management UI and API hardening

**Validation commands:**
```bash
docker compose config
docker compose ps
docker compose exec forgeos id
curl -fsS http://localhost:3000/api/setup/status
```

---

### Phase 2: Web-UI Core

**Implemented:**
- [x] Dashboard layout skeleton (PanelGrid, MenuBar, StatusBar, Sidebar shell)
- [x] Sidebar: Project list + File tree with git status badges
- [x] Terminal panel (xterm.js + WebSocket PTY)
- [x] Provider control-plane UI (active orchestrator selection)
- [x] Settings overlay (Global and Project settings)
- [x] User menu with profile and logout
- [x] File editor panel (CodeMirror viewer/editor)
- [x] Git integration (commit overlay, push button)
- [x] Tab-group panel system (single/split layouts, localStorage persistence)

**In Progress:**
- [ ] AI Chat panel runtime integration
- [ ] Preview panel
- [ ] Status bar full runtime data (live branch/model)
- [ ] Project context switching backend integration

**Planned:**
- [ ] Slash command palette in menu bar
- [ ] Persisted panel layouts per user
- [ ] Chat runtime with stream transport and provider routing execution

**Validation commands:**
```bash
curl -fsS http://localhost:3000/api/projects
curl -fsS http://localhost:3000/api/provider-routing
curl -fsS http://localhost:3000/api/terminal
```

---

### Phase 3: Permissions + Settings

**Implemented:**
- [ ] None

**In Progress:**
- [ ] Architecture and policy decisions are finalized (D1–D12)

**Planned:**
- [ ] 4-level permission system (UI + enforcement)
- [ ] Per-project permission overrides
- [ ] Settings page (re-run wizard parts)
- [ ] User management (admin: invite, revoke)
- [ ] Project management (add, remove, access control)
- [ ] Superpowers management (install, update, review)

**Validation commands:**
```bash
curl -fsS http://localhost:3000/api/setup/status
```

---

### Phase 4: Intelligence + Multi-Provider

**Implemented:**
- [ ] Multi-provider control-plane scaffolding (Claude/Codex credentials + routing state)

**In Progress:**
- [ ] Runtime orchestration still Claude-first

**Planned:**
- [ ] Session persistence across restarts
- [ ] Chat history per user per project
- [ ] Git sync automation
- [ ] Memory system (context from past sessions)
- [ ] Additional AI runtimes (Gemini, OpenCode, Codex runtime execution)
- [ ] Model routing execution layer (right model for right task)

**Validation commands:**
```bash
curl -fsS http://localhost:3000/api/setup/status
curl -fsS http://localhost:3000/api/provider-routing
```

---

## Delta Roadmap (Executable TODO)

> **Status 2026-04-02**: All delta items reset to undone for fresh implementation.

### Current Implementation Baseline

- Dockerfile supports forge UID/GID build args: `FORGE_UID` and `FORGE_GID`
- Compose runs container as non-root user: `${FORGE_UID}:${FORGE_GID}`
- Entry point rejects root startup path by default
- `.env.example` includes `FORGE_UID` and `FORGE_GID`
- Superpowers installed globally via npm in Dockerfile

### Delta Scope (Next Build Steps)

| Scope | Files | Validation | Status |
|-------|-------|------------|--------|
| Wizard credentials expansion (Claude + Codex, API key/OAuth/device flow) | `src/app/setup/page.tsx`, `src/components/setup/ClaudeStep.tsx`, `src/app/api/setup/*` | `/api/setup/status`, wizard step 3/4 rendering, save flow | `todo` |
| Orchestrator + task-specific provider model routing | `src/lib/provider-model.ts`, `src/app/api/provider-routing/route.ts` | `/api/provider-routing` GET/POST, StatusBar/MenuBar state | `todo` |
| Rollout phase reality correction | `ARCHITECTURE.md` | manual architecture review + command blocks | `todo` |

### Track A — Architecture Delta and Backlog Control

- [ ] Add a dedicated "Current Implementation Baseline" subsection to this document.
  - Files: `ARCHITECTURE.md`
  - Include: Dockerfile UID/GID args, compose non-root user, root-start guard in entrypoint, `.env.example` UID/GID keys, superpowers install path.
  - Done when: baseline is documented as "implemented", not "planned".

- [ ] Add a "Delta Scope (Next Build Steps)" table with owners and status.
  - Files: `ARCHITECTURE.md`
  - Rows: Wizard credentials expansion, orchestrator/provider UI, rollout checklist correction.
  - Done when: each row has `scope`, `files`, `validation`, `status`.

### Track B — Wizard Credentials Expansion (Claude + Codex)

- [ ] Extend setup data model to support provider credentials independently.
  - Files: `src/app/setup/page.tsx`, `src/components/setup/ClaudeStep.tsx`, `src/components/setup/SummaryStep.tsx`
  - Add explicit modes per provider: `api_key`, `oauth`, `device_flow`.
  - Done when: state can hold both Claude and Codex auth configuration in parallel.

- [ ] Replace Claude-only auth step with provider-aware credential step.
  - Files: `src/components/setup/ClaudeStep.tsx` (rename/split), `src/components/setup/styles.ts`
  - UX: tabs or segmented control for `Claude` and `Codex`; each with method selector.
  - Done when: wizard can capture and validate auth settings for both providers.

- [ ] Add/extend setup API endpoints for provider credential tests and persistence.
  - Files: `src/app/api/setup/claude-test/route.ts`, `src/app/api/setup/save/route.ts`, `src/app/api/setup/status/route.ts`
  - Done when: `/api/setup/save` persists both provider configs and `/api/setup/status` returns both.

### Track C — Dashboard Model Routing (Claude vs Codex)

- [ ] Add orchestrator selection in dashboard state.
  - Files: `src/components/layout/DashboardShell.tsx`, `src/components/layout/MenuBar.tsx`, `src/components/layout/StatusBar.tsx`
  - Add: global orchestrator switch (`Claude`, `Codex`) with persisted user preference.
  - Done when: active orchestrator is visible and survives reload.

- [ ] Add task-specific provider routing model.
  - Files: `src/lib/config.ts`, `src/app/api/provider-routing/route.ts`
  - Routing buckets: `chat`, `code_edit`, `planning`, `terminal_assist`.
  - Done when: each bucket can target Claude or Codex explicitly.

- [ ] Wire routing config into chat/runtime request path.
  - Files: `src/components/layout/PanelGrid.tsx`, future chat runtime route(s)
  - Done when: selected orchestrator and task-route config are passed to backend request payloads.

### Track D — Rollout Phase Reality Check

- [ ] Reconcile incorrect completion markers in "Rollout Phases".
  - Files: `ARCHITECTURE.md`
  - Verify each `[x]` against actual files/routes/components present in repo.
  - Done when: no item is marked complete without implementation evidence.

- [ ] Split "implemented now" vs "planned next" in each phase.
  - Files: `ARCHITECTURE.md`
  - Add per-phase subsections: `Implemented`, `In Progress`, `Planned`.
  - Done when: phase status can be read without ambiguous mixed checkboxes.

- [ ] Add explicit validation commands per phase.
  - Files: `ARCHITECTURE.md`
  - Include concrete checks: `docker compose config`, API route smoke checks, UI path checks.
  - Done when: each phase has at least one reproducible validation command block.

---

## Open Decisions

> **Review 2026-04-02**: All decisions D1–D12 are marked `decided`.
> They should be migrated to the Resolved Decisions table in the next cleanup pass.
> **D9 discrepancy flagged**: Recommendation says "per-project subprocess lifecycle"
> but Decision says "shared process" — confirm which is authoritative.

### D1 — ORM and Migration Tooling

- **Question**: Use Prisma or Drizzle as the canonical DB layer?
- **Option A (Prisma)** — Pros: mature ecosystem, strong migration workflows, fast onboarding. Cons: heavier runtime/tooling, less SQL-native feel.
- **Option B (Drizzle)** — Pros: lightweight, SQL-first, strong TypeScript inference. Cons: fewer batteries included, more manual patterns.
- **Recommendation**: **Prisma** for delivery speed and team familiarity.
- **Decision**: `Prisma`
- **Status**: `decided`

### D2 — Session Architecture

- **Question**: JWT-based sessions or DB-backed session cookies?
- **Option A (JWT)** — Pros: stateless, easy horizontal scaling. Cons: revocation complexity.
- **Option B (DB-backed cookie sessions)** — Pros: explicit server-side control, straightforward revoke/expiry. Cons: DB lookup on auth checks.
- **Recommendation**: **DB-backed session cookies** for multi-user admin controls.
- **Decision**: `DB-backed session cookies`
- **Status**: `decided`

### D3 — File Editor Engine

- **Question**: Monaco or CodeMirror for the embedded editor?
- **Option A (Monaco)** — Pros: VS Code-like UX, rich language tooling. Cons: heavier bundle.
- **Option B (CodeMirror)** — Pros: lighter and faster load, easier incremental integration. Cons: fewer out-of-box IDE features.
- **Recommendation**: **CodeMirror** for Phase 2, evaluate Monaco later if needed.
- **Decision**: `CodeMirror`
- **Status**: `decided`

### D4 — Protected File Policy

- **Question**: Final protected file list and write rules per permission level?
- **Option A (strict fixed list)** — Pros: predictable enforcement.
- **Option B (fixed core + configurable extensions)** — Pros: safer default plus adaptability.
- **Recommendation**: **fixed core + configurable extensions**.
- **Decision**: `fixed core + configurable extensions`
- **Status**: `decided`

### D5 — Shell Command Permission Model

- **Question**: Command allow/deny by categories or by explicit command list?
- **Option A (category-based)** — Pros: scalable policy definition.
- **Option B (explicit command list)** — Pros: maximal control. Cons: brittle.
- **Recommendation**: **category-based model** with critical command deny-list.
- **Decision**: `category-based model`
- **Status**: `decided`

### D6 — Package Installation Rights

- **Question**: Who may run package installs (`apt`, `npm i`, etc.)?
- **Option A (admin only)** — Pros: lower supply-chain risk.
- **Option B (per-project configurable)** — Pros: flexibility by trust context.
- **Recommendation**: **admin-only globally**, optional per-project override later.
- **Decision**: `admin-only globally`
- **Status**: `decided`

### D7 — Invite and Account Security Policy

- **Question**: Invite link/token format, expiry, and password policy?
- **Option A (single-use token + short expiry + strong password policy)** — Pros: stronger baseline security.
- **Option B (long-lived invite codes + minimal password policy)** — Pros: easier onboarding.
- **Recommendation**: **single-use invite tokens with expiry + strong password policy**.
- **Decision**: `single-use token + short expiry + strong password policy`
- **Status**: `decided`

### D8 — Project Isolation Strategy

- **Question**: Application policy only, or add OS-level sandboxing?
- **Option A (policy-only first)** — Pros: fastest to ship. Cons: weaker defense.
- **Option B (policy + OS-level isolation)** — Pros: stronger containment. Cons: higher complexity.
- **Recommendation**: **policy-first in Phase 2**, then OS-level isolation in Phase 3.
- **Decision**: `policy-first in Phase 2`
- **Status**: `decided`

### D9 — Claude Runtime Lifecycle Contract

- **Question**: One shared Claude subprocess or per-project subprocess lifecycle?
- **Option A (shared process)** — Pros: lower resource usage. Cons: context leakage risk.
- **Option B (per-project process)** — Pros: cleaner context boundaries. Cons: more process churn.
- **Recommendation**: **per-project subprocess lifecycle**.
- **Decision**: `shared process`
- **Status**: `decided` ⚠️ *Discrepancy: recommendation ≠ decision. Needs confirmation.*

### D10 — Device Flow Provider Scope

- **Question**: Which providers are in MVP scope?
- **Option A (GitHub + Claude only in MVP)** — Pros: reduced complexity.
- **Option B (add more providers now)** — Pros: broader adoption.
- **Recommendation**: **GitHub + Claude only for MVP**, explicit fallback docs/workflow.
- **Decision**: `GitHub + Claude + Codex in MVP`
- **Status**: `decided`

### D11 — Data Retention and Backup Rules

- **Question**: Session/chat retention, purge policy, and required backup set?
- **Option A (minimal retention, strict purge windows)** — Pros: privacy-friendly.
- **Option B (long retention with manual cleanup)** — Pros: richer context/history.
- **Recommendation**: **default retention windows with admin-configurable extension**.
- **Decision**: `short default retention with optional extension`
- **Status**: `decided`

### D12 — Delivery Gates and Completion Criteria

- **Question**: Exact acceptance criteria per phase and definition of done?
- **Option A (lightweight checklist)** — Pros: fast iteration.
- **Option B (testable acceptance criteria + validation checklist)** — Pros: clear quality gate.
- **Recommendation**: **testable acceptance criteria per phase**.
- **Decision**: `testable acceptance criteria (TDD-oriented)`
- **Status**: `decided`

---

## Resolved Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Root or non-root? | Non-root (forge), single entrypoint | Security best practice + Claude Code requirement |
| Two entrypoints? | No, one file with self-detection | Simpler, less error-prone |
| Wizard tech? | Next.js (same as app) | One codebase, one port, grows into full Web-UI |
| Auth pattern? | Device Flow (GitHub + Claude + Codex) | Headless-friendly, no SSH tunnel needed |
| Single/Multi user? | Multi from start | SQLite + auth from Phase 1 avoids retrofit |
| Domain? | forgeos.trend-forge.dev | Via Traefik |
| Mobile? | Yes, responsive | CSS framework handles it |
| Wizard reusable? | Yes, from Settings page | Same components, different route |
| ORM? | Prisma | Delivery speed, migrations, team familiarity (D1) |
| Session type? | DB-backed session cookies | Revocation control, multi-user admin (D2) |
| File editor? | CodeMirror (Phase 2) | Lighter bundle, incremental integration (D3) |
| Permission policy? | Fixed core + configurable extensions | Predictable + adaptable (D4) |
| Shell commands? | Category-based deny-list | Scalable, maintainable (D5) |
| Package installs? | Admin-only globally | Supply-chain risk reduction (D6) |
| Invites? | Single-use token + expiry | Security baseline (D7) |
| Project isolation? | Policy-first, OS-level later | Ship fast, harden in Phase 3 (D8) |
| AI process lifecycle? | ⚠️ Unresolved — see D9 | shared vs. per-project TBD |
| MVP auth providers? | GitHub + Claude + Codex | Sufficient for MVP (D10) |
| Data retention? | Short default + optional extension | Privacy-friendly default (D11) |
| Delivery gates? | Testable acceptance criteria | TDD-oriented quality gates (D12) |

---

## Phase 2 Features

Implemented in Phase 2 (2026-04-02):

- **Setup security hardening** — one-time only, 410 Gone after completion, server-side redirect
- **Extended auth methods** — Git: Device Flow, PAT, SSH key; Claude: API key, OAuth; Codex: API key, Device Flow, Azure
- **Settings overlay** — Global (Git/Claude/Codex) and Project settings, modal overlay from user menu
- **User menu** — dropdown with profile, global settings, project settings, logout
- **Sidebar file tree** — lazy-loaded tree, git status badges (M/U/D), right-click context menu, inline rename
- **Git integration** — commit overlay with file selection, push button, toast notifications
- **Tab-group panel system** — single/split-h/split-v layouts, draggable splitter, localStorage persistence
- **CodeMirror editor** — viewer/editor modes, syntax highlighting, Ctrl+S save, dirty indicator
- **Two-layer AI memory** — base knowledge in `docs/ai-context/` (Git), learned memory in `/root/.forgeos/ai-memory/` (volume)
- **File + Git API routes** — `/api/files/*` and `/api/git/*` with path validation and auth
