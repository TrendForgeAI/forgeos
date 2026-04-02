# ForgeOS — Key Components

## Entry Points
- `server.ts` → `server.js` — HTTP+WS server, wraps Next.js
- `src/app/layout.tsx` — root layout, imports xterm CSS
- `src/app/page.tsx` — root redirect (→ /dashboard or /setup)
- `src/app/dashboard/page.tsx` — main app (server component, auth-gated)
- `src/app/setup/page.tsx` — setup wizard (server component, redirects if complete)
- `src/app/login/page.tsx` — login form

## Dashboard Shell
- `DashboardShell.tsx` — top-level client component, owns layout state
  - `MenuBar.tsx` — top bar: logo, orchestrator toggle, layout toggle, UserMenu
  - `Sidebar.tsx` — left panel: file tree with git badges, commit/push buttons
  - `PanelGrid.tsx` — main area: tab-group system (terminal, chat, editor, viewer)
  - `StatusBar.tsx` — bottom bar: orchestrator, active project, status

## Panel Components
- `TabGroup.tsx` — one panel group with tab bar and active panel
- `TabBar.tsx` — tab list with +/× controls
- `SplitPane.tsx` — draggable splitter between two groups
- `TerminalPanel.tsx` — xterm.js terminal (dynamic import)
- `ChatPanel.tsx` — AI chat (Claude or Codex)
- `EditorPanel.tsx` — CodeMirror viewer/editor

## Settings
- `UserMenu.tsx` — dropdown in MenuBar: Profile, Global Settings, Project Settings, Logout
- `GlobalSettingsOverlay.tsx` — modal: Git, Claude, Codex auth
- `ProjectSettingsOverlay.tsx` — modal: ForgeOS project + subprojects config

## Shared Auth Components (used in wizard AND settings overlay)
- `GitSettings.tsx` — Device Flow, PAT, SSH key
- `ClaudeSettings.tsx` — API key, OAuth
- `CodexSettings.tsx` — API key, Device Flow, Azure

## API Routes
- `/api/auth/login` POST, `/api/auth/logout` POST
- `/api/setup/*` — wizard steps (return 410 after setup complete)
- `/api/projects` GET — list projects in /workspace
- `/api/files` GET — directory listing
- `/api/files/read` GET — file content
- `/api/files/write` POST — write file
- `/api/files/action` POST — mkdir/rename/delete
- `/api/git/status` GET — git status --porcelain
- `/api/git/commit` POST — git commit
- `/api/git/push` POST — git push
- `/api/terminal` WS — PTY terminal

## Lib
- `src/lib/db.ts` — Prisma singleton
- `src/lib/auth.ts` — session CRUD, requireAuth(), requireAdmin()
- `src/lib/config.ts` — Config key/value store, isSetupComplete(), assertSetupIncomplete()
- `src/lib/files.ts` — path validation (validatePath), restricts to /app and /workspace
