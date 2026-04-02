# ForgeOS Phase 2 — Design Spec

**Date:** 2026-04-02  
**Status:** Approved by user  
**Scope:** Setup fixes, Settings overlay, Extended auth, Sidebar with Git, Panel system (Tab-Groups), Viewer/Editor, User menu, Two-layer AI memory, Docs

---

## 1. Overview

This spec covers all features agreed upon in the 2026-04-02 brainstorming session. Work is organized into 4 groups executed in order:

- **Group A** — Setup bug fixes + security hardening
- **Group B** — Settings overlay + extended auth methods
- **Group C** — UI components (user menu, sidebar, panel system, editor)
- **Group D** — Docs + two-layer AI memory

---

## 2. Group A — Setup Bug Fix + Security

### A1 — Setup Wizard Logic

**Problem:** `POST /api/setup/admin` returns 409 "Setup already complete" as soon as an admin user exists. The wizard has no way to continue to Git/AI/Project steps after the first partial run.

**Solution:**
- `GET /setup` (page): On load, call `isSetupComplete()`. If true → `redirect("/login")`.
- `POST /api/setup/admin`: Returns 410 Gone (not 409) when setup is complete.
- All `/api/setup/*` routes return 410 Gone after setup is complete.
- After the final wizard step (ProjectStep `onComplete`): The flag is already set by the existence of an admin user — no extra DB write needed.

### A2 — Full Name in Session

**Problem:** The `name` field exists in the User schema and is saved by AdminStep, but the login API may not return it properly.

**Solution:**
- Audit `POST /api/auth/login`: ensure the response includes `{ id, email, name, role }`.
- Audit `GET /app/dashboard`: ensure `requireAuth()` returns `name` in the user object passed to `DashboardShell`.

### Security Hardening

- `/setup` page: Unconditional redirect to `/login` if `isSetupComplete() === true`. No exceptions.
- All `/api/setup/*` routes: Return `410 Gone` with `{ error: "Setup already complete" }` when complete.
- This prevents an attacker from overwriting admin credentials or config via the setup API.

---

## 3. Group B — Settings Overlay + Extended Auth

### B1 — Settings Overlay

- Accessible via the User Menu (top-right dropdown).
- Rendered as a modal overlay on top of the Dashboard — no separate route/page.
- Two overlay types:
  1. **Global Settings** — Credentials (Git, Claude, Codex), theme, other global config.
  2. **Project Settings** — Two tabs: *ForgeOS Project* (active project metadata) and *Subprojects* (per-subproject config for future use: versioning logic, CI config, etc.).
- Closing via ESC or × button returns to the Dashboard unchanged.
- Save writes directly to the `Config` table (same mechanism as Wizard save).

### B2 — Extended Auth Methods

#### Git

| Method | Implementation |
|--------|----------------|
| GitHub Device Flow | Already implemented in GitStep — keep as-is |
| Personal Access Token (PAT) | Text input, stored as `github_token` in Config |
| SSH Key | Generate Ed25519 keypair in container (`ssh-keygen`), display public key for user to paste into GitHub/GitLab. Store in `/root/.ssh/` (already volume-mounted). |

#### Claude (Anthropic)

| Method | Implementation |
|--------|----------------|
| API Key | Already implemented (`sk-ant-...`) |
| claude.ai OAuth | Run `claude auth login --print-url` as subprocess, display URL. User opens browser. Poll `/root/.claude/` for auth token file. Store result as `claude_auth_method=oauth` in Config. |

#### Codex (OpenAI)

| Method | Implementation |
|--------|----------------|
| OpenAI API Key | Already implemented (`sk-...`) |
| OpenAI Device Flow | `POST https://auth.openai.com/codex/device` → display user code + URL. Poll for token. Store as `codex_auth_method=device_flow` + token in Config. |
| Azure OpenAI | Text inputs: Endpoint URL + API Key. Store as `codex_azure_endpoint` + `codex_azure_key` in Config. |

### B3 — Credential Persistence

Architecture already correct: Named Docker volumes cover all credential locations:
- `forgeos-data` → `/root/.forgeos` (SQLite with Config table)
- `claude-data` → `/root/.claude` (Claude Code auth)
- `ssh-keys` → `/root/.ssh` (SSH keypair)
- `gh-config` → `/root/.config/gh` (GitHub CLI tokens)

No additional work needed. Credentials survive `docker compose up --build`.

---

## 4. Group C — UI Components

### C1 — User Menu

Replace the static `user.name` + "Sign out" button in `MenuBar` with a dropdown:

```
[Username ▾]
  ├── Profil
  ├── Globale Einstellungen  →  opens Global Settings overlay
  ├── Projekt-Einstellungen  →  opens Project Settings overlay
  └── Ausloggen
```

Implementation: A `<details>`/`<summary>` or custom click-outside dropdown component in `MenuBar.tsx`.

### C2 — Sidebar File Tree

**Structure:**
```
[ProjectName]          ← root node (bold, folder icon)
  ├── src/
  │   ├── app/         ← expandable
  │   └── lib/
  ├── package.json     ← M  (modified, yellow)
  └── README.md        ← U  (untracked, green)

─────────────────────  ← visible only when changes exist
[Commit]  [Push]
```

**Behavior:**
- Directories: click to expand/collapse
- Files: click to open in Viewer tab in PanelGrid
- Right-click context menu: New File, New Folder, Rename, Delete
- Git status badges: `M` (modified, yellow), `U` (untracked, green), `D` (deleted, red)
- Git status refreshed on: sidebar load, after file save, after commit
- Commit button: opens mini-overlay with checklist of changed files + commit message input
- Push button: runs `git push`, shows toast with success/error

**API Routes (new):**
- `GET /api/files?path=<dir>` — returns directory listing (name, type, children for dirs)
- `GET /api/files/read?path=<file>` — returns file content
- `POST /api/files/write` — `{ path, content }` — writes file
- `POST /api/files/action` — `{ action: "mkdir"|"rename"|"delete", path, newPath? }`
- `GET /api/git/status?path=<repo>` — returns `git status --porcelain` parsed
- `POST /api/git/commit` — `{ path, message, files[] }`
- `POST /api/git/push` — `{ path }`

### C3 — Panel System (Tab-Groups)

**Layout model:**

```
PanelGrid
├── layout: "single" | "split-h" | "split-v"
├── GroupA (left/top)
│   ├── tabs: [Tab, Tab, ...]
│   └── activeTabId
└── GroupB (right/bottom, only in split layouts)
    ├── tabs: [Tab, Tab, ...]
    └── activeTabId
```

**Tab types:** `terminal` | `chat-claude` | `chat-codex` | `editor` | `viewer`

**Controls:**
- Layout toggle in MenuBar: single / split-h / split-v icons
- Each group has: tab bar with tabs, + button (add tab), × per tab (close)
- Splitter between groups: draggable (resizes with mouse)
- Tab with unsaved changes: title prefixed with `•`, close prompts confirmation

**Persistence:** Layout + open tabs stored in `localStorage` (key: `forgeos_layout_v1`).

**New components:**
- `PanelGrid.tsx` — rewritten, owns layout state
- `TabGroup.tsx` — renders one group with tab bar + active panel
- `TabBar.tsx` — tab list with +/× controls
- `SplitPane.tsx` — draggable splitter between two groups
- `ChatPanel.tsx` — AI chat UI (claude or codex), placeholder for now

### C4 — Viewer / Editor

**Viewer mode (default when opening file from sidebar):**
- CodeMirror 6 instance, `readOnly: true`
- Syntax highlighting via `@codemirror/language` + `@codemirror/lang-*` packages
- Language auto-detected from file extension
- Header bar: filename, "Bearbeiten" button

**Editor mode (after clicking "Bearbeiten"):**
- Same CodeMirror instance, `readOnly: false`
- Header bar switches to: filename + `•` if unsaved, "Speichern" button, "Schließen" button
- Save: `POST /api/files/write`, refreshes git status in sidebar
- Close with unsaved changes: browser confirm dialog

---

## 5. Group D — Docs + Two-Layer AI Memory

### D1 — README.md

Standard project README covering:
- What is ForgeOS
- Prerequisites (Docker, Docker Compose)
- Quick start (`git clone` + `docker compose up`)
- Setup wizard walkthrough
- Volume overview (what persists where)
- Contributing / development setup

### D2 — ARCHITECTURE.md Update

- Correct outdated sections (forge user → root, non-root references)
- Mark completed items with `[x]`
- Add new sections: Panel System, Settings Overlay, Two-Layer Memory, Git Integration

### D3 — Two-Layer AI Memory

**Layer 1 — Base Knowledge** (in Git, versioned):
```
/app/docs/ai-context/
  forgeos-overview.md     Vision, what ForgeOS is
  architecture.md         Technical architecture (concise)
  components.md           Key components, file paths, responsibilities
  decisions.md            Architecture decisions + rationale
  codex-notes.md          Codex-specific context and quirks
```

**Layer 2 — Learned Knowledge** (in Named Volume, persistent):
```
/root/.forgeos/ai-memory/
  MEMORY.md               Index of all learned memories
  *.md                    Session insights, user preferences, project-specific learnings
```

**Entry points:**
- `CLAUDE.md` — updated to reference both `/app/docs/ai-context/` and `/root/.forgeos/ai-memory/MEMORY.md`
- `AGENTS.md` (new) — equivalent entry point for Codex, same structure

**Git pull safety:** `/docs/ai-context/` updates with repo. Volume is never touched by git. No merge conflicts.

---

## 6. Implementation Order

1. **A1 + A2** — Setup fix + full name (unblocks everything)
2. **D3** — AI memory structure (create files, update CLAUDE.md)
3. **B2** — Extended auth in Wizard (Git SSH, Claude OAuth, Codex Device Flow + Azure)
4. **B1** — Settings overlay (reuses B2 components)
5. **C1** — User menu (prerequisite for opening Settings overlay)
6. **C2** — Sidebar file tree + Git integration
7. **C3** — Panel system rewrite
8. **C4** — Viewer/Editor (CodeMirror)
9. **D1** — README.md
10. **D2** — ARCHITECTURE.md update

---

## 7. Constraints

- All new API routes need `export const dynamic = "force-dynamic"`
- `node-pty` remains in `serverExternalPackages` — do not change
- CodeMirror 6 must be dynamically imported (client-only, like xterm.js)
- No new DB models needed — all credentials go in `Config` table as key/value
- File operations (read/write/delete) are scoped to `/app` (ForgeOS root project) and `/workspace` (subprojects) — never allow paths outside these two roots
