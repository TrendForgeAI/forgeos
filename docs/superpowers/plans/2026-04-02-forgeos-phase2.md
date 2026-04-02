# ForgeOS Phase 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix setup wizard, add settings overlay, extend auth methods, rebuild sidebar with file tree + git integration, implement tab-group panel system, add CodeMirror viewer/editor, add user menu, and set up two-layer AI memory.

**Architecture:** Next.js App Router with a custom Node.js HTTP+WebSocket server. All new API routes use `export const dynamic = "force-dynamic"`. Client-only components (CodeMirror, xterm.js) are dynamically imported. Credentials stored in `Config` table (SQLite via Prisma, persisted in Named Volume). Layout state in `localStorage`.

**Tech Stack:** Next.js 15 App Router, Prisma + SQLite, Tailwind/CSS custom properties, CodeMirror 6, node-pty over WebSocket, TypeScript throughout.

**Dev note:** The production server runs `node server.js`. To develop, run `npm run dev` in the container (uses `tsx server.ts` with hot reload). After all changes are done, run `npm run build` to produce the production build.

**Spec:** `docs/superpowers/specs/2026-04-02-forgeos-phase2-design.md`

---

## File Map

### New files
- `src/app/api/setup/ssh-key/route.ts` — generate SSH keypair, return public key
- `src/app/api/setup/claude-oauth/route.ts` — start/poll claude auth login
- `src/app/api/setup/codex-device/route.ts` — OpenAI device flow
- `src/app/api/files/route.ts` — directory listing
- `src/app/api/files/read/route.ts` — read file content
- `src/app/api/files/write/route.ts` — write file content
- `src/app/api/files/action/route.ts` — mkdir, rename, delete
- `src/app/api/git/status/route.ts` — git status --porcelain
- `src/app/api/git/commit/route.ts` — git commit
- `src/app/api/git/push/route.ts` — git push
- `src/components/layout/UserMenu.tsx` — dropdown: profile, settings, logout
- `src/components/layout/TabGroup.tsx` — one panel group with tab bar
- `src/components/layout/TabBar.tsx` — tab list with +/× controls
- `src/components/layout/SplitPane.tsx` — draggable splitter
- `src/components/layout/FileTree.tsx` — recursive file/dir tree node
- `src/components/layout/ContextMenu.tsx` — right-click context menu
- `src/components/layout/CommitOverlay.tsx` — commit dialog
- `src/components/layout/Toast.tsx` — transient success/error message
- `src/components/chat/ChatPanel.tsx` — AI chat placeholder
- `src/components/editor/EditorPanel.tsx` — CodeMirror viewer/editor
- `src/components/settings/GlobalSettingsOverlay.tsx` — modal for credentials
- `src/components/settings/ProjectSettingsOverlay.tsx` — modal for project config
- `src/components/settings/GitSettings.tsx` — git auth section (reused in wizard + overlay)
- `src/components/settings/ClaudeSettings.tsx` — claude auth section
- `src/components/settings/CodexSettings.tsx` — codex auth section
- `AGENTS.md` — Codex entry point (mirrors CLAUDE.md structure)
- `README.md` — project readme
- `docs/ai-context/forgeos-overview.md`
- `docs/ai-context/architecture.md`
- `docs/ai-context/components.md`
- `docs/ai-context/decisions.md`
- `docs/ai-context/codex-notes.md`

### Modified files
- `src/app/setup/page.tsx` — add server-side `isSetupComplete` redirect
- `src/app/api/setup/admin/route.ts` — 410 instead of 409
- `src/app/api/setup/github/route.ts` — 410 guard
- `src/app/api/setup/save/route.ts` — 410 guard + extended auth fields
- `src/app/api/setup/claude-test/route.ts` — 410 guard
- `src/components/setup/GitStep.tsx` — add PAT + SSH key methods
- `src/components/setup/AIStep.tsx` — add Claude OAuth + Codex device flow + Azure
- `src/components/layout/DashboardShell.tsx` — add overlay state, pass to MenuBar
- `src/components/layout/MenuBar.tsx` — replace name+signout with UserMenu + layout controls
- `src/components/layout/Sidebar.tsx` — rewrite as file tree with git badges + commit/push
- `src/components/layout/PanelGrid.tsx` — rewrite as tab-group system
- `src/components/layout/StatusBar.tsx` — minor: read from layout context
- `CLAUDE.md` — reference both ai-context layers
- `ARCHITECTURE.md` — update with current state

---

## Task 1: Setup security fix (Group A)

**Files:**
- Modify: `src/app/setup/page.tsx`
- Modify: `src/app/api/setup/admin/route.ts`
- Modify: `src/app/api/setup/github/route.ts`
- Modify: `src/app/api/setup/save/route.ts`
- Modify: `src/app/api/setup/claude-test/route.ts`

- [ ] **Step 1: Convert setup page to server component with redirect**

Replace entire `src/app/setup/page.tsx` with:

```tsx
// src/app/setup/page.tsx
import { redirect } from "next/navigation";
import { isSetupComplete } from "@/lib/config";
import SetupWizard from "@/components/setup/SetupWizard";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const done = await isSetupComplete();
  if (done) redirect("/login");
  return <SetupWizard />;
}
```

- [ ] **Step 2: Extract wizard client component**

Move all current `SetupPage` client code from `src/app/setup/page.tsx` into new file `src/components/setup/SetupWizard.tsx`:

```tsx
"use client";

import { useState } from "react";
import AdminStep from "@/components/setup/AdminStep";
import GitStep from "@/components/setup/GitStep";
import AIStep from "@/components/setup/AIStep";
import ProjectStep from "@/components/setup/ProjectStep";

type Step = "admin" | "git" | "ai" | "project" | "done";

interface SetupData {
  admin: { email: string; password: string; name: string } | null;
  git: { name: string; email: string; githubAuth: boolean } | null;
  ai: { claude: { method: string; value: string } | null; codex: { apiKey: string } | null };
  project: { repoUrl: string; name: string } | null;
}

export default function SetupWizard() {
  const [step, setStep] = useState<Step>("admin");
  const [data, setData] = useState<SetupData>({
    admin: null, git: null,
    ai: { claude: null, codex: null },
    project: null,
  });

  const steps: Step[] = ["admin", "git", "ai", "project"];
  const stepLabels = ["Admin Account", "Git Identity", "AI Providers", "First Project"];
  const currentIndex = steps.indexOf(step);

  if (step === "done") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", padding: "48px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>✓</div>
          <h2 style={{ color: "var(--success)", marginBottom: "8px" }}>ForgeOS is ready</h2>
          <p style={{ color: "var(--muted)", marginBottom: "24px" }}>Setup complete. Redirecting to login…</p>
          <a href="/login" className="btn-primary" style={{ padding: "10px 24px", textDecoration: "none", borderRadius: "6px", background: "var(--accent)", color: "white" }}>
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "520px" }}>
        <div style={{ marginBottom: "32px", textAlign: "center" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>ForgeOS Setup</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px" }}>Step {currentIndex + 1} of {steps.length}</p>
        </div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "32px" }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "100%", height: "3px", background: i <= currentIndex ? "var(--accent)" : "var(--border)", borderRadius: "2px", transition: "background 0.3s" }} />
              <span style={{ fontSize: "11px", color: i === currentIndex ? "var(--text)" : "var(--muted)" }}>{stepLabels[i]}</span>
            </div>
          ))}
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "32px" }}>
          {step === "admin" && <AdminStep onComplete={(adminData) => { setData(d => ({ ...d, admin: adminData })); setStep("git"); }} />}
          {step === "git" && <GitStep onComplete={(gitData) => { setData(d => ({ ...d, git: gitData })); setStep("ai"); }} />}
          {step === "ai" && <AIStep onComplete={(aiData) => { setData(d => ({ ...d, ai: aiData })); setStep("project"); }} />}
          {step === "project" && <ProjectStep setupData={data} onComplete={() => setStep("done")} />}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add 410 guard to all setup API routes**

Add this helper to `src/lib/config.ts`:

```ts
export async function assertSetupIncomplete(): Promise<void> {
  const done = await isSetupComplete();
  if (done) throw Object.assign(new Error("Setup already complete"), { status: 410 });
}
```

In `src/app/api/setup/admin/route.ts`, replace the `isSetupComplete` check:

```ts
import { assertSetupIncomplete } from "@/lib/config";
// ...
export async function POST(req: NextRequest) {
  try {
    await assertSetupIncomplete();
    // ... rest unchanged
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status === 410) return NextResponse.json({ error: "Setup already complete" }, { status: 410 });
    console.error("Admin setup error:", err);
    return NextResponse.json({ error: "Failed to create admin account" }, { status: 500 });
  }
}
```

Apply the same pattern to `src/app/api/setup/github/route.ts`, `src/app/api/setup/save/route.ts`, and `src/app/api/setup/claude-test/route.ts` — add `await assertSetupIncomplete();` as the first line in each handler, catch with 410 response.

- [ ] **Step 4: Verify manually**

```bash
npm run build && node server.js &
# 1. Visit /setup — should show wizard
# 2. Fill in admin form, click Create Account → should advance to Git step
# 3. Re-visit /setup — should redirect to /login
# 4. curl -X POST http://localhost:3000/api/setup/admin → 410
```

- [ ] **Step 5: Commit**

```bash
git add src/app/setup/page.tsx src/components/setup/SetupWizard.tsx \
        src/app/api/setup/ src/lib/config.ts
git commit -m "fix(setup): redirect to login if complete, 410 on repeat API calls"
```

---

## Task 2: Two-Layer AI Memory (Group D3)

**Files:**
- Create: `docs/ai-context/forgeos-overview.md`
- Create: `docs/ai-context/architecture.md`
- Create: `docs/ai-context/components.md`
- Create: `docs/ai-context/decisions.md`
- Create: `docs/ai-context/codex-notes.md`
- Modify: `CLAUDE.md`
- Create: `AGENTS.md`

- [ ] **Step 1: Create docs/ai-context/ base knowledge files**

`docs/ai-context/forgeos-overview.md`:
```markdown
# ForgeOS — Overview

ForgeOS is a containerized, multi-user AI development environment. It runs as a Docker container and exposes a Next.js web UI (port 3000) serving as a full IDE shell.

## Core Purpose
- Give AI assistants (Claude Code, Codex) a persistent, browser-accessible workspace
- Multi-user with role-based access (admin / user)
- Setup wizard on first run; credentials stored in named volumes (survive rebuilds)
- Git-integrated: clone projects, edit files, commit, push — all from the browser

## What Users Do
1. `docker compose up` → visit the URL → run setup wizard
2. Authenticate Claude and/or Codex
3. Connect GitHub via Device Flow, PAT, or SSH key
4. Open projects in the sidebar, edit files, run terminals, chat with AI
```

`docs/ai-context/architecture.md`:
```markdown
# ForgeOS — Technical Architecture

## Process Model
- `node server.js` — custom HTTP+WebSocket server (compiled from `server.ts`)
- Wraps Next.js App Router for HTTP; adds WebSocket for PTY terminals
- WebSocket: `ws://host/api/terminal?path=<cwd>` → spawns bash via node-pty

## Key Layers
| Layer | Tech | Notes |
|-------|------|-------|
| Framework | Next.js 15 App Router | Server + client components |
| DB | SQLite via Prisma | `/root/.forgeos/forgeos.db` |
| Auth | Session cookies | `forgeos_session`, 7-day TTL, DB-backed |
| Terminal | xterm.js + node-pty | WebSocket relay |
| Editor | CodeMirror 6 | Dynamic import (client-only) |
| Reverse Proxy | Traefik v3 | External, SSL via Let's Encrypt |

## Volumes (all data survives docker compose up --build)
| Volume | Mount | Contents |
|--------|-------|----------|
| forgeos-data | /root/.forgeos | SQLite DB, ai-memory |
| claude-data | /root/.claude | Claude Code auth |
| ssh-keys | /root/.ssh | SSH keypair |
| gh-config | /root/.config/gh | GitHub CLI tokens |
| forgeos-workspace | /workspace | Project repos |

## Credential Storage
All credentials go in the `Config` table (key/value) in SQLite. Keys:
- `git_user_name`, `git_user_email`
- `github_auth_status`, `github_access_token`, `github_token` (PAT)
- `claude_auth_method` (api_key | oauth), `claude_api_key`
- `codex_auth_method` (api_key | device_flow | azure), `codex_api_key`
- `codex_azure_endpoint`, `codex_azure_key`
- `active_orchestrator`, `provider_routing` (JSON)
```

`docs/ai-context/components.md`:
```markdown
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
```

`docs/ai-context/decisions.md`:
```markdown
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
All credentials (API keys, auth tokens) go in the `Config` table as encrypted-at-rest
key/value pairs. No separate secrets manager needed for single-host deployment.

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
```

`docs/ai-context/codex-notes.md`:
```markdown
# ForgeOS — Notes for Codex

## Running Codex in ForgeOS
Codex CLI is available as `codex` in the container. Auth methods:
- API key: set OPENAI_API_KEY env var (stored in Config, applied at subprocess spawn)
- Device flow: token stored in Config as codex_device_token

## Working with This Codebase
- TypeScript throughout — no implicit any
- Next.js App Router: pages in src/app/, components in src/components/
- All server components that use DB need `export const dynamic = "force-dynamic"`
- CSS via Tailwind v4 + CSS custom properties (--bg, --surface, --border, --accent, --muted, --text)
- node-pty is native — never import it in client components

## Key Patterns
- Auth check in API routes: wrap in try/catch, call requireAuth() or requireAdmin()
- Config access: use getConfig(key) / setConfig(key, value) from src/lib/config.ts
- New API routes: always add `export const dynamic = "force-dynamic"` at top

## Quirks
- xterm.js CSS must be imported in layout.tsx (not via CSS @import)
- CodeMirror 6 must be dynamically imported (client-only)
- Build order: prisma generate → next build → tsc (npm run build handles this)
```

- [ ] **Step 2: Update CLAUDE.md to reference both memory layers**

Add this section at the end of `CLAUDE.md`:

```markdown
## AI Memory Layers

### Base Knowledge (read on every session — in Git)
The following files contain structured knowledge about ForgeOS:
- `docs/ai-context/forgeos-overview.md` — what ForgeOS is
- `docs/ai-context/architecture.md` — technical architecture
- `docs/ai-context/components.md` — key components and file paths
- `docs/ai-context/decisions.md` — architecture decisions and rationale

Read these when starting work in this codebase.

### Learned Knowledge (persistent — in Volume, not in Git)
Session insights and user preferences are stored in:
- `/root/.forgeos/ai-memory/MEMORY.md` — index
- `/root/.forgeos/ai-memory/*.md` — individual memory files

This directory may not exist yet on first run — create it if needed.
```

- [ ] **Step 3: Create AGENTS.md**

```markdown
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
```

- [ ] **Step 4: Create /root/.forgeos/ai-memory/ directory**

```bash
mkdir -p /root/.forgeos/ai-memory
cat > /root/.forgeos/ai-memory/MEMORY.md << 'EOF'
# ForgeOS AI Memory Index

This file is auto-maintained by Claude and Codex across sessions.
Entries below are session learnings that supplement the base knowledge in /app/docs/ai-context/.

## Entries
(none yet — will grow with usage)
EOF
```

- [ ] **Step 5: Commit**

```bash
git add docs/ai-context/ CLAUDE.md AGENTS.md
git commit -m "docs: add two-layer AI memory structure (base knowledge + AGENTS.md)"
```

---

## Task 3: Extended Auth — Shared Settings Components (Group B2 prerequisite)

These components are shared between the wizard AND the settings overlay. Build them first.

**Files:**
- Create: `src/components/settings/GitSettings.tsx`
- Create: `src/components/settings/ClaudeSettings.tsx`
- Create: `src/components/settings/CodexSettings.tsx`
- Create: `src/app/api/setup/ssh-key/route.ts`
- Create: `src/app/api/setup/claude-oauth/route.ts`
- Create: `src/app/api/setup/codex-device/route.ts`

- [ ] **Step 1: Create SSH key API route**

`src/app/api/setup/ssh-key/route.ts`:

```ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { readFile, access } from "fs/promises";
import { assertSetupIncomplete } from "@/lib/config";

const execAsync = promisify(exec);
const KEY_PATH = "/root/.ssh/id_ed25519";

export async function POST() {
  try {
    // Check if key already exists
    try {
      await access(KEY_PATH);
      const pub = await readFile(`${KEY_PATH}.pub`, "utf-8");
      return NextResponse.json({ publicKey: pub.trim(), existed: true });
    } catch {
      // Key doesn't exist, generate it
    }

    await execAsync(`ssh-keygen -t ed25519 -f ${KEY_PATH} -N "" -C "forgeos"`);
    const pub = await readFile(`${KEY_PATH}.pub`, "utf-8");
    return NextResponse.json({ publicKey: pub.trim(), existed: false });
  } catch (err) {
    console.error("SSH key gen error:", err);
    return NextResponse.json({ error: "Failed to generate SSH key" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const pub = await readFile(`${KEY_PATH}.pub`, "utf-8");
    return NextResponse.json({ publicKey: pub.trim() });
  } catch {
    return NextResponse.json({ publicKey: null });
  }
}
```

- [ ] **Step 2: Create Claude OAuth API route**

`src/app/api/setup/claude-oauth/route.ts`:

```ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { access } from "fs/promises";
import { setConfig } from "@/lib/config";

const execAsync = promisify(exec);
const CLAUDE_AUTH_FILE = "/root/.claude/.credentials.json";

export async function POST() {
  // Start claude auth login, capture URL
  try {
    const { stdout } = await execAsync("claude auth login --print-url 2>&1", { timeout: 10000 });
    const urlMatch = stdout.match(/https?:\/\/[^\s]+/);
    if (!urlMatch) {
      return NextResponse.json({ error: "Could not get auth URL from claude" }, { status: 500 });
    }
    return NextResponse.json({ url: urlMatch[0] });
  } catch (err) {
    console.error("Claude OAuth start error:", err);
    return NextResponse.json({ error: "Failed to start claude auth" }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  // Poll for auth completion
  try {
    await access(CLAUDE_AUTH_FILE);
    await setConfig("claude_auth_method", "oauth");
    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
```

- [ ] **Step 3: Create Codex Device Flow API route**

`src/app/api/setup/codex-device/route.ts`:

```ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { setConfig } from "@/lib/config";

const DEVICE_URL = "https://auth.openai.com/codex/device";

export async function POST() {
  try {
    const res = await fetch(DEVICE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: "codex" }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "OpenAI device flow failed" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      interval: data.interval || 5,
    });
  } catch (err) {
    console.error("Codex device flow error:", err);
    return NextResponse.json({ error: "Failed to start Codex device flow" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { deviceCode } = await req.json();
    const res = await fetch("https://auth.openai.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: deviceCode,
        client_id: "codex",
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      await setConfig("codex_auth_method", "device_flow");
      await setConfig("codex_device_token", data.access_token);
      return NextResponse.json({ authenticated: true });
    }
    return NextResponse.json({ authenticated: false, error: data.error });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
```

- [ ] **Step 4: Create GitSettings shared component**

`src/components/settings/GitSettings.tsx`:

```tsx
"use client";

import { useState } from "react";

type GitMethod = "device_flow" | "pat" | "ssh";

interface Props {
  defaultMethod?: GitMethod;
  onSave?: (data: { method: GitMethod; value?: string; githubAuth?: boolean }) => void;
  /** If true, shows a "Save" button. If false, auto-calls onSave when done. */
  showSaveButton?: boolean;
}

type GHState = "idle" | "polling" | "done" | "error";

export default function GitSettings({ defaultMethod = "device_flow", onSave, showSaveButton }: Props) {
  const [method, setMethod] = useState<GitMethod>(defaultMethod);
  const [pat, setPat] = useState("");
  const [sshPubKey, setSshPubKey] = useState("");
  const [ghState, setGhState] = useState<GHState>("idle");
  const [deviceCode, setDeviceCode] = useState<{ userCode: string; verificationUri: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateSSHKey() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/setup/ssh-key", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSshPubKey(json.publicKey);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function startGitHubAuth() {
    setError("");
    setGhState("polling");
    try {
      const res = await fetch("/api/setup/github", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setDeviceCode({ userCode: json.userCode, verificationUri: json.verificationUri });
      pollForGitHubAuth(json.deviceCode, json.interval || 5);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "GitHub auth failed");
      setGhState("error");
    }
  }

  async function pollForGitHubAuth(code: string, interval: number) {
    for (let i = 0; i < 24; i++) {
      await new Promise(r => setTimeout(r, interval * 1000));
      try {
        const res = await fetch("/api/setup/github", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceCode: code }),
        });
        const json = await res.json();
        if (json.authenticated) {
          setGhState("done");
          if (!showSaveButton) onSave?.({ method: "device_flow", githubAuth: true });
          return;
        }
      } catch { /* continue */ }
    }
    setError("GitHub auth timed out. Try again.");
    setGhState("error");
  }

  async function handleSave() {
    if (method === "pat") {
      if (!pat) { setError("PAT required"); return; }
      const res = await fetch("/api/setup/github", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pat }),
      });
      if (res.ok) onSave?.({ method: "pat", value: pat });
      else setError("Failed to save PAT");
    } else if (method === "ssh") {
      onSave?.({ method: "ssh", value: sshPubKey });
    } else {
      onSave?.({ method: "device_flow", githubAuth: ghState === "done" });
    }
  }

  const sectionStyle = { border: "1px solid var(--border)", borderRadius: "8px", padding: "16px" };
  const methodBtn = (m: GitMethod, label: string) => (
    <button key={m} type="button" onClick={() => setMethod(m)} style={{
      padding: "6px 12px", borderRadius: "6px", border: "1px solid",
      borderColor: method === m ? "var(--accent)" : "var(--border)",
      background: method === m ? "rgba(59,130,246,0.1)" : "transparent",
      color: "var(--text)", cursor: "pointer", fontSize: "13px",
    }}>{label}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", gap: "8px" }}>
        {methodBtn("device_flow", "GitHub Device Flow")}
        {methodBtn("pat", "Personal Access Token")}
        {methodBtn("ssh", "SSH Key")}
      </div>

      {method === "device_flow" && (
        <div style={sectionStyle}>
          {ghState === "idle" && <button type="button" onClick={startGitHubAuth} className="btn-secondary" style={{ width: "100%" }}>Connect GitHub</button>}
          {ghState === "polling" && deviceCode && (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "8px" }}>
                Open <a href={deviceCode.verificationUri} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{deviceCode.verificationUri}</a> and enter:
              </p>
              <div style={{ fontSize: "24px", fontWeight: "bold", letterSpacing: "0.2em", padding: "12px", background: "var(--bg)", borderRadius: "6px" }}>{deviceCode.userCode}</div>
              <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "8px" }}>Waiting for authorization…</p>
            </div>
          )}
          {ghState === "done" && <p style={{ color: "var(--success)", fontSize: "13px" }}>✓ GitHub connected</p>}
          {ghState === "error" && (
            <div>
              <p style={{ color: "var(--danger)", fontSize: "13px", marginBottom: "8px" }}>{error}</p>
              <button type="button" onClick={startGitHubAuth} className="btn-secondary" style={{ width: "100%" }}>Retry</button>
            </div>
          )}
        </div>
      )}

      {method === "pat" && (
        <div style={sectionStyle}>
          <label style={{ fontSize: "13px", color: "var(--muted)", display: "block", marginBottom: "6px" }}>Personal Access Token</label>
          <input type="password" value={pat} onChange={e => setPat(e.target.value)} placeholder="ghp_..." style={{ width: "100%" }} />
          <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "6px" }}>Requires: repo, read:org, user:email scopes</p>
        </div>
      )}

      {method === "ssh" && (
        <div style={sectionStyle}>
          {!sshPubKey ? (
            <button type="button" onClick={generateSSHKey} className="btn-secondary" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Generating…" : "Generate SSH Key"}
            </button>
          ) : (
            <div>
              <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "8px" }}>Add this public key to GitHub/GitLab → Settings → SSH Keys:</p>
              <textarea readOnly value={sshPubKey} style={{ width: "100%", height: "80px", fontSize: "11px", fontFamily: "monospace", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "4px", padding: "8px", resize: "none" }} />
              <button type="button" onClick={() => navigator.clipboard.writeText(sshPubKey)} className="btn-secondary" style={{ marginTop: "6px", width: "100%" }}>Copy to clipboard</button>
            </div>
          )}
        </div>
      )}

      {error && method !== "device_flow" && <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>}

      {showSaveButton && (
        <button type="button" onClick={handleSave} className="btn-primary">Save Git Settings</button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Add PAT endpoint to github route**

Add `PATCH` handler to `src/app/api/setup/github/route.ts`:

```ts
export async function PATCH(req: NextRequest) {
  try {
    await assertSetupIncomplete().catch(() => {}); // allow in settings too
    const { pat } = await req.json();
    if (!pat) return NextResponse.json({ error: "pat required" }, { status: 400 });
    await setConfig("github_auth_status", "authenticated");
    await setConfig("github_token", pat);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to save PAT" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Create ClaudeSettings component**

`src/components/settings/ClaudeSettings.tsx`:

```tsx
"use client";

import { useState } from "react";

type ClaudeMethod = "api_key" | "oauth" | "skip";

interface Props {
  showSaveButton?: boolean;
  onSave?: (data: { method: ClaudeMethod; value?: string } | null) => void;
}

export default function ClaudeSettings({ showSaveButton, onSave }: Props) {
  const [method, setMethod] = useState<ClaudeMethod>("api_key");
  const [apiKey, setApiKey] = useState("");
  const [oauthUrl, setOauthUrl] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [oauthDone, setOauthDone] = useState(false);
  const [error, setError] = useState("");

  async function testKey() {
    if (!apiKey) return;
    setTestStatus("testing");
    setError("");
    try {
      const res = await fetch("/api/setup/claude-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const json = await res.json();
      setTestStatus(json.valid ? "ok" : "fail");
      if (!json.valid) setError(json.error || "Invalid API key");
    } catch {
      setTestStatus("fail");
      setError("Connection failed");
    }
  }

  async function startOAuth() {
    setError("");
    try {
      const res = await fetch("/api/setup/claude-oauth", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setOauthUrl(json.url);
      pollOAuth();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start OAuth");
    }
  }

  async function pollOAuth() {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const res = await fetch("/api/setup/claude-oauth");
        const json = await res.json();
        if (json.authenticated) { setOauthDone(true); return; }
      } catch { /* continue */ }
    }
    setError("OAuth timed out. Try again.");
  }

  const methodBtn = (m: ClaudeMethod, label: string) => (
    <button key={m} type="button" onClick={() => setMethod(m)} style={{
      padding: "6px 12px", borderRadius: "6px", border: "1px solid",
      borderColor: method === m ? "var(--accent)" : "var(--border)",
      background: method === m ? "rgba(59,130,246,0.1)" : "transparent",
      color: "var(--text)", cursor: "pointer", fontSize: "13px",
    }}>{label}</button>
  );

  const sectionStyle = { border: "1px solid var(--border)", borderRadius: "8px", padding: "16px" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", gap: "8px" }}>
        {methodBtn("api_key", "API Key")}
        {methodBtn("oauth", "claude.ai Login")}
        {methodBtn("skip", "Skip")}
      </div>

      {method === "api_key" && (
        <div style={sectionStyle}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input value={apiKey} onChange={e => { setApiKey(e.target.value); setTestStatus("idle"); }}
              placeholder="sk-ant-..." type="password" />
            <button type="button" onClick={testKey} className="btn-secondary"
              style={{ whiteSpace: "nowrap", width: "auto" }}
              disabled={!apiKey || testStatus === "testing"}>
              {testStatus === "testing" ? "…" : testStatus === "ok" ? "✓" : "Test"}
            </button>
          </div>
          {testStatus === "ok" && <p style={{ color: "var(--success)", fontSize: "12px", marginTop: "6px" }}>API key valid</p>}
          {testStatus === "fail" && <p style={{ color: "var(--danger)", fontSize: "12px", marginTop: "6px" }}>{error}</p>}
        </div>
      )}

      {method === "oauth" && (
        <div style={sectionStyle}>
          {!oauthUrl && !oauthDone && (
            <button type="button" onClick={startOAuth} className="btn-secondary" style={{ width: "100%" }}>
              Open claude.ai Login
            </button>
          )}
          {oauthUrl && !oauthDone && (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "8px" }}>Open this URL in your browser:</p>
              <a href={oauthUrl} target="_blank" rel="noreferrer"
                style={{ fontSize: "12px", color: "var(--accent)", wordBreak: "break-all" }}>{oauthUrl}</a>
              <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "8px" }}>Waiting for authorization…</p>
            </div>
          )}
          {oauthDone && <p style={{ color: "var(--success)", fontSize: "13px" }}>✓ claude.ai connected</p>}
          {error && <p style={{ color: "var(--danger)", fontSize: "13px", marginTop: "8px" }}>{error}</p>}
        </div>
      )}

      {method === "skip" && (
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>Claude will not be configured. You can set this up later in Settings.</p>
      )}

      {showSaveButton && method !== "skip" && (
        <button type="button" onClick={() => {
          if (method === "api_key" && apiKey) onSave?.({ method: "api_key", value: apiKey });
          else if (method === "oauth" && oauthDone) onSave?.({ method: "oauth" });
        }} className="btn-primary">Save Claude Settings</button>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Create CodexSettings component**

`src/components/settings/CodexSettings.tsx`:

```tsx
"use client";

import { useState } from "react";

type CodexMethod = "api_key" | "device_flow" | "azure" | "skip";

interface Props {
  showSaveButton?: boolean;
  onSave?: (data: { method: CodexMethod; apiKey?: string; azureEndpoint?: string; azureKey?: string } | null) => void;
}

export default function CodexSettings({ showSaveButton, onSave }: Props) {
  const [method, setMethod] = useState<CodexMethod>("api_key");
  const [apiKey, setApiKey] = useState("");
  const [azureEndpoint, setAzureEndpoint] = useState("");
  const [azureKey, setAzureKey] = useState("");
  const [deviceCode, setDeviceCode] = useState<{ userCode: string; verificationUri: string } | null>(null);
  const [deviceDone, setDeviceDone] = useState(false);
  const [error, setError] = useState("");

  async function startDeviceFlow() {
    setError("");
    try {
      const res = await fetch("/api/setup/codex-device", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDeviceCode({ userCode: json.userCode, verificationUri: json.verificationUri });
      pollDevice(json.deviceCode, json.interval);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function pollDevice(code: string, interval: number) {
    for (let i = 0; i < 24; i++) {
      await new Promise(r => setTimeout(r, interval * 1000));
      try {
        const res = await fetch("/api/setup/codex-device", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceCode: code }),
        });
        const json = await res.json();
        if (json.authenticated) { setDeviceDone(true); return; }
      } catch { /* continue */ }
    }
    setError("Device flow timed out.");
  }

  const methodBtn = (m: CodexMethod, label: string) => (
    <button key={m} type="button" onClick={() => setMethod(m)} style={{
      padding: "6px 12px", borderRadius: "6px", border: "1px solid",
      borderColor: method === m ? "var(--accent)" : "var(--border)",
      background: method === m ? "rgba(59,130,246,0.1)" : "transparent",
      color: "var(--text)", cursor: "pointer", fontSize: "13px",
    }}>{label}</button>
  );

  const sectionStyle = { border: "1px solid var(--border)", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column" as const, gap: "8px" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
        {methodBtn("api_key", "API Key")}
        {methodBtn("device_flow", "Device Flow")}
        {methodBtn("azure", "Azure OpenAI")}
        {methodBtn("skip", "Skip")}
      </div>

      {method === "api_key" && (
        <div style={sectionStyle}>
          <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." type="password" />
        </div>
      )}

      {method === "device_flow" && (
        <div style={sectionStyle}>
          {!deviceCode && !deviceDone && (
            <button type="button" onClick={startDeviceFlow} className="btn-secondary" style={{ width: "100%" }}>Start Device Flow</button>
          )}
          {deviceCode && !deviceDone && (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "8px" }}>
                Open <a href={deviceCode.verificationUri} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{deviceCode.verificationUri}</a> and enter:
              </p>
              <div style={{ fontSize: "24px", fontWeight: "bold", letterSpacing: "0.2em", padding: "12px", background: "var(--bg)", borderRadius: "6px" }}>{deviceCode.userCode}</div>
              <p style={{ fontSize: "12px", color: "var(--muted)", marginTop: "8px" }}>Waiting for authorization…</p>
            </div>
          )}
          {deviceDone && <p style={{ color: "var(--success)", fontSize: "13px" }}>✓ OpenAI connected</p>}
          {error && <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>}
        </div>
      )}

      {method === "azure" && (
        <div style={sectionStyle}>
          <label style={{ fontSize: "13px", color: "var(--muted)" }}>Azure OpenAI Endpoint</label>
          <input value={azureEndpoint} onChange={e => setAzureEndpoint(e.target.value)} placeholder="https://your-resource.openai.azure.com/" />
          <label style={{ fontSize: "13px", color: "var(--muted)" }}>API Key</label>
          <input value={azureKey} onChange={e => setAzureKey(e.target.value)} placeholder="••••••••" type="password" />
        </div>
      )}

      {error && method !== "device_flow" && <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>}

      {showSaveButton && (
        <button type="button" onClick={() => {
          if (method === "api_key") onSave?.({ method, apiKey });
          else if (method === "device_flow" && deviceDone) onSave?.({ method });
          else if (method === "azure") onSave?.({ method, azureEndpoint, azureKey });
          else onSave?.(null);
        }} className="btn-primary">Save Codex Settings</button>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Update Wizard to use shared components**

Replace content of `src/components/setup/GitStep.tsx`:

```tsx
"use client";
import GitSettings from "@/components/settings/GitSettings";

interface Props {
  onComplete: (data: { name: string; email: string; githubAuth: boolean }) => void;
}

export default function GitStep({ onComplete }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "4px" }}>Git Identity</h2>
        <p style={{ color: "var(--muted)", fontSize: "13px" }}>Connect GitHub via Device Flow, a Personal Access Token, or SSH key.</p>
      </div>
      <GitSettings onSave={(data) => onComplete({ name: "", email: "", githubAuth: data.githubAuth ?? false })} />
      <button type="button" className="btn-primary" onClick={() => onComplete({ name: "", email: "", githubAuth: false })} style={{ marginTop: "8px" }}>
        Continue →
      </button>
    </div>
  );
}
```

Replace content of `src/components/setup/AIStep.tsx`:

```tsx
"use client";
import ClaudeSettings from "@/components/settings/ClaudeSettings";
import CodexSettings from "@/components/settings/CodexSettings";

interface AIData {
  claude: { method: string; value: string } | null;
  codex: { apiKey: string } | null;
}

interface Props {
  onComplete: (data: AIData) => void;
}

export default function AIStep({ onComplete }: Props) {
  let claudeData: AIData["claude"] = null;
  let codexData: AIData["codex"] = null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "4px" }}>AI Providers</h2>
        <p style={{ color: "var(--muted)", fontSize: "13px" }}>Configure Claude and/or Codex. Both are optional.</p>
      </div>

      <div>
        <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>Claude (Anthropic)</h3>
        <ClaudeSettings onSave={(d) => { claudeData = d ? { method: d.method, value: d.value ?? "" } : null; }} />
      </div>

      <div>
        <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>Codex (OpenAI)</h3>
        <CodexSettings onSave={(d) => { codexData = d?.apiKey ? { apiKey: d.apiKey } : null; }} />
      </div>

      <button type="button" className="btn-primary" onClick={() => onComplete({ claude: claudeData, codex: codexData })}>
        Continue →
      </button>
    </div>
  );
}
```

- [ ] **Step 9: Commit**

```bash
git add src/app/api/setup/ssh-key/ src/app/api/setup/claude-oauth/ \
        src/app/api/setup/codex-device/ src/app/api/setup/github/route.ts \
        src/components/settings/ src/components/setup/GitStep.tsx \
        src/components/setup/AIStep.tsx
git commit -m "feat(auth): extended auth methods for Git, Claude, Codex"
```

---

## Task 4: Settings Overlay + User Menu (Groups B1 + C1)

**Files:**
- Create: `src/components/settings/GlobalSettingsOverlay.tsx`
- Create: `src/components/settings/ProjectSettingsOverlay.tsx`
- Create: `src/components/layout/UserMenu.tsx`
- Modify: `src/components/layout/MenuBar.tsx`
- Modify: `src/components/layout/DashboardShell.tsx`

- [ ] **Step 1: Create GlobalSettingsOverlay**

`src/components/settings/GlobalSettingsOverlay.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import GitSettings from "./GitSettings";
import ClaudeSettings from "./ClaudeSettings";
import CodexSettings from "./CodexSettings";

interface Props {
  onClose: () => void;
}

type Tab = "git" | "claude" | "codex";

export default function GlobalSettingsOverlay({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>("git");
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tabBtn = (t: Tab, label: string) => (
    <button key={t} type="button" onClick={() => setTab(t)} style={{
      padding: "8px 16px", borderBottom: "2px solid",
      borderColor: tab === t ? "var(--accent)" : "transparent",
      background: "transparent", color: tab === t ? "var(--accent)" : "var(--muted)",
      cursor: "pointer", fontSize: "13px", fontWeight: tab === t ? 600 : 400,
    }}>{label}</button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={overlayRef} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", width: "560px", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600" }}>Global Settings</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "18px" }}>×</button>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
          {tabBtn("git", "Git")}
          {tabBtn("claude", "Claude")}
          {tabBtn("codex", "Codex")}
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
          {tab === "git" && <GitSettings showSaveButton onSave={() => onClose()} />}
          {tab === "claude" && <ClaudeSettings showSaveButton onSave={() => onClose()} />}
          {tab === "codex" && <CodexSettings showSaveButton onSave={() => onClose()} />}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ProjectSettingsOverlay**

`src/components/settings/ProjectSettingsOverlay.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

interface Props {
  activeProject: string | null;
  onClose: () => void;
}

type Tab = "forgeos" | "subprojects";

export default function ProjectSettingsOverlay({ activeProject, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("forgeos");

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tabBtn = (t: Tab, label: string) => (
    <button key={t} type="button" onClick={() => setTab(t)} style={{
      padding: "8px 16px", borderBottom: "2px solid",
      borderColor: tab === t ? "var(--accent)" : "transparent",
      background: "transparent", color: tab === t ? "var(--accent)" : "var(--muted)",
      cursor: "pointer", fontSize: "13px", fontWeight: tab === t ? 600 : 400,
    }}>{label}</button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", width: "560px", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600" }}>Project Settings</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "18px" }}>×</button>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
          {tabBtn("forgeos", "ForgeOS Project")}
          {tabBtn("subprojects", "Subprojects")}
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
          {tab === "forgeos" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "13px", color: "var(--muted)", display: "block", marginBottom: "6px" }}>Active Project Path</label>
                <input readOnly value={activeProject ?? "(none selected)"} style={{ width: "100%", opacity: 0.7 }} />
              </div>
              <p style={{ fontSize: "13px", color: "var(--muted)" }}>Additional project settings (versioning logic, CI config) will appear here in future releases.</p>
            </div>
          )}
          {tab === "subprojects" && (
            <p style={{ fontSize: "13px", color: "var(--muted)" }}>Per-subproject settings will appear here in future releases.</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create UserMenu component**

`src/components/layout/UserMenu.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  user: { name: string; email: string };
  onOpenGlobalSettings: () => void;
  onOpenProjectSettings: () => void;
}

export default function UserMenu({ user, onOpenGlobalSettings, onOpenProjectSettings }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const itemStyle: React.CSSProperties = {
    display: "block", width: "100%", textAlign: "left",
    padding: "8px 16px", border: "none", background: "transparent",
    color: "var(--text)", cursor: "pointer", fontSize: "13px",
    whiteSpace: "nowrap",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: open ? "var(--bg)" : "transparent", color: "var(--text)", cursor: "pointer", fontSize: "13px" }}>
        {user.name}
        <span style={{ fontSize: "10px", color: "var(--muted)" }}>▾</span>
      </button>

      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", minWidth: "180px", zIndex: 100, overflow: "hidden" }}>
          <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border)" }}>
            <p style={{ fontSize: "12px", fontWeight: 600 }}>{user.name}</p>
            <p style={{ fontSize: "11px", color: "var(--muted)" }}>{user.email}</p>
          </div>
          <button style={itemStyle} onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")} onClick={() => { setOpen(false); /* TODO: profile overlay */ }}>Profil</button>
          <button style={itemStyle} onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")} onClick={() => { setOpen(false); onOpenGlobalSettings(); }}>Globale Einstellungen</button>
          <button style={itemStyle} onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")} onClick={() => { setOpen(false); onOpenProjectSettings(); }}>Projekt-Einstellungen</button>
          <div style={{ borderTop: "1px solid var(--border)" }}>
            <button style={{ ...itemStyle, color: "var(--danger)" }} onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")} onClick={handleLogout}>Ausloggen</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update DashboardShell to manage overlay state**

Replace `src/components/layout/DashboardShell.tsx`:

```tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import MenuBar from "./MenuBar";
import StatusBar from "./StatusBar";
import Sidebar from "./Sidebar";
import PanelGrid from "./PanelGrid";

const GlobalSettingsOverlay = dynamic(() => import("@/components/settings/GlobalSettingsOverlay"), { ssr: false });
const ProjectSettingsOverlay = dynamic(() => import("@/components/settings/ProjectSettingsOverlay"), { ssr: false });

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Props {
  user: User;
}

export default function DashboardShell({ user }: Props) {
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [orchestrator, setOrchestrator] = useState<"claude" | "codex">("claude");
  const [overlay, setOverlay] = useState<"global-settings" | "project-settings" | null>(null);
  const [layout, setLayout] = useState<"single" | "split-h" | "split-v">("single");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <MenuBar
        user={user}
        orchestrator={orchestrator}
        layout={layout}
        onOrchestratorChange={setOrchestrator}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
        onLayoutChange={setLayout}
        onOpenGlobalSettings={() => setOverlay("global-settings")}
        onOpenProjectSettings={() => setOverlay("project-settings")}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {sidebarOpen && (
          <Sidebar
            activeProject={activeProject}
            onSelectProject={setActiveProject}
          />
        )}
        <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <PanelGrid activeProject={activeProject} layout={layout} />
        </main>
      </div>

      <StatusBar orchestrator={orchestrator} activeProject={activeProject} />

      {overlay === "global-settings" && <GlobalSettingsOverlay onClose={() => setOverlay(null)} />}
      {overlay === "project-settings" && <ProjectSettingsOverlay activeProject={activeProject} onClose={() => setOverlay(null)} />}
    </div>
  );
}
```

- [ ] **Step 5: Update MenuBar to use UserMenu + layout controls**

Replace `src/components/layout/MenuBar.tsx`:

```tsx
"use client";

import UserMenu from "./UserMenu";

interface User {
  name: string;
  email: string;
  role: string;
}

interface Props {
  user: User;
  orchestrator: "claude" | "codex";
  layout: "single" | "split-h" | "split-v";
  onOrchestratorChange: (o: "claude" | "codex") => void;
  onToggleSidebar: () => void;
  onLayoutChange: (l: "single" | "split-h" | "split-v") => void;
  onOpenGlobalSettings: () => void;
  onOpenProjectSettings: () => void;
}

export default function MenuBar({ user, orchestrator, layout, onOrchestratorChange, onToggleSidebar, onLayoutChange, onOpenGlobalSettings, onOpenProjectSettings }: Props) {
  const layoutBtn = (l: "single" | "split-h" | "split-v", icon: string, title: string) => (
    <button key={l} type="button" onClick={() => onLayoutChange(l)} title={title}
      style={{ padding: "3px 8px", borderRadius: "4px", border: "none", background: layout === l ? "var(--accent)" : "transparent", color: layout === l ? "white" : "var(--muted)", fontSize: "14px", cursor: "pointer" }}>
      {icon}
    </button>
  );

  return (
    <header style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 16px", height: "40px", background: "var(--surface)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
      <button onClick={onToggleSidebar} style={{ padding: "4px 8px", fontSize: "16px", border: "none", background: "transparent", color: "var(--muted)", cursor: "pointer" }} title="Toggle sidebar">☰</button>
      <span style={{ fontWeight: "bold", fontSize: "14px", color: "var(--text)" }}>ForgeOS</span>
      <div style={{ flex: 1 }} />

      {/* Layout toggle */}
      <div style={{ display: "flex", gap: "2px", background: "var(--bg)", borderRadius: "6px", padding: "3px" }}>
        {layoutBtn("single", "▪", "Single panel")}
        {layoutBtn("split-h", "⬜⬜", "Split horizontal")}
        {layoutBtn("split-v", "🟦", "Split vertical")}
      </div>

      {/* Orchestrator selector */}
      <div style={{ display: "flex", gap: "4px", background: "var(--bg)", borderRadius: "6px", padding: "3px" }}>
        {(["claude", "codex"] as const).map(o => (
          <button key={o} type="button" onClick={() => onOrchestratorChange(o)}
            style={{ padding: "3px 10px", borderRadius: "4px", border: "none", background: orchestrator === o ? "var(--accent)" : "transparent", color: orchestrator === o ? "white" : "var(--muted)", fontSize: "12px", cursor: "pointer", textTransform: "capitalize" }}>
            {o}
          </button>
        ))}
      </div>

      <UserMenu user={user} onOpenGlobalSettings={onOpenGlobalSettings} onOpenProjectSettings={onOpenProjectSettings} />
    </header>
  );
}
```

- [ ] **Step 6: Build and verify**

```bash
npm run build
# Visit dashboard — should see username dropdown in top-right
# Click dropdown → Global Settings → should open overlay with Git/Claude/Codex tabs
# Press ESC → overlay closes, dashboard visible
# Click Ausloggen → redirected to /login
```

- [ ] **Step 7: Commit**

```bash
git add src/components/settings/ src/components/layout/UserMenu.tsx \
        src/components/layout/MenuBar.tsx src/components/layout/DashboardShell.tsx
git commit -m "feat(ui): user menu dropdown + settings overlay (global + project)"
```

---

## Task 5: File + Git API Routes (Group C2 backend)

**Files:**
- Create: `src/app/api/files/route.ts`
- Create: `src/app/api/files/read/route.ts`
- Create: `src/app/api/files/write/route.ts`
- Create: `src/app/api/files/action/route.ts`
- Create: `src/app/api/git/status/route.ts`
- Create: `src/app/api/git/commit/route.ts`
- Create: `src/app/api/git/push/route.ts`

- [ ] **Step 1: Create path validation helper in lib**

Add to `src/lib/files.ts` (new file):

```ts
import { resolve } from "path";

const ALLOWED_ROOTS = ["/app", "/workspace"];

export function validatePath(inputPath: string): string {
  const resolved = resolve(inputPath);
  const allowed = ALLOWED_ROOTS.some(root => resolved === root || resolved.startsWith(root + "/"));
  if (!allowed) throw Object.assign(new Error("Path not allowed"), { status: 403 });
  return resolved;
}
```

- [ ] **Step 2: Create directory listing route**

`src/app/api/files/route.ts`:

```ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import path from "path";
import { validatePath } from "@/lib/files";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const dir = req.nextUrl.searchParams.get("path") ?? "/workspace";
    const safe = validatePath(dir);

    const entries = await readdir(safe, { withFileTypes: true });
    const items = await Promise.all(
      entries
        .filter(e => !e.name.startsWith(".") || e.name === ".git")
        .map(async (e) => {
          const fullPath = path.join(safe, e.name);
          const s = await stat(fullPath).catch(() => null);
          return {
            name: e.name,
            path: fullPath,
            type: e.isDirectory() ? "dir" : "file",
            size: s?.size ?? 0,
          };
        })
    );

    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ items });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status === 403) return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to list directory" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create file read route**

`src/app/api/files/read/route.ts`:

```ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { validatePath } from "@/lib/files";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const filePath = req.nextUrl.searchParams.get("path");
    if (!filePath) return NextResponse.json({ error: "path required" }, { status: 400 });
    const safe = validatePath(filePath);
    const content = await readFile(safe, "utf-8");
    return NextResponse.json({ content });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; code?: string };
    if (e.status === 403) return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
    if (e.code === "ENOENT") return NextResponse.json({ error: "File not found" }, { status: 404 });
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create file write route**

`src/app/api/files/write/route.ts`:

```ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { validatePath } from "@/lib/files";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { path: filePath, content } = await req.json();
    if (!filePath || content === undefined) return NextResponse.json({ error: "path and content required" }, { status: 400 });
    const safe = validatePath(filePath);
    await mkdir(path.dirname(safe), { recursive: true });
    await writeFile(safe, content, "utf-8");
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const e = err as { status?: number };
    if (e.status === 403) return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
    return NextResponse.json({ error: "Failed to write file" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Create file action route**

`src/app/api/files/action/route.ts`:

```ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { mkdir, rename, rm, writeFile } from "fs/promises";
import path from "path";
import { validatePath } from "@/lib/files";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { action, path: filePath, newPath, name } = await req.json();
    const safe = validatePath(filePath);

    if (action === "mkdir") {
      const dirPath = name ? path.join(safe, name) : safe;
      await mkdir(dirPath, { recursive: true });
    } else if (action === "newfile") {
      const newFile = path.join(safe, name ?? "newfile.txt");
      validatePath(newFile);
      await writeFile(newFile, "", "utf-8");
    } else if (action === "rename") {
      if (!newPath) return NextResponse.json({ error: "newPath required" }, { status: 400 });
      const safeDest = validatePath(newPath);
      await rename(safe, safeDest);
    } else if (action === "delete") {
      await rm(safe, { recursive: true, force: true });
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const e = err as { status?: number };
    if (e.status === 403) return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Create git status route**

`src/app/api/git/status/route.ts`:

```ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { validatePath } from "@/lib/files";
import { requireAuth } from "@/lib/auth";

const execAsync = promisify(exec);

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const repoPath = req.nextUrl.searchParams.get("path") ?? "/workspace";
    const safe = validatePath(repoPath);

    const { stdout } = await execAsync("git status --porcelain", { cwd: safe });
    const changes = stdout.trim().split("\n").filter(Boolean).map(line => ({
      status: line.slice(0, 2).trim(),
      path: line.slice(3),
    }));

    return NextResponse.json({ changes });
  } catch {
    return NextResponse.json({ changes: [] });
  }
}
```

- [ ] **Step 7: Create git commit route**

`src/app/api/git/commit/route.ts`:

```ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { validatePath } from "@/lib/files";
import { requireAuth } from "@/lib/auth";
import { getConfig } from "@/lib/config";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { path: repoPath, message, files } = await req.json();
    if (!repoPath || !message) return NextResponse.json({ error: "path and message required" }, { status: 400 });
    const safe = validatePath(repoPath);

    const gitName = (await getConfig("git_user_name")) ?? "ForgeOS";
    const gitEmail = (await getConfig("git_user_email")) ?? "forgeos@localhost";

    const env = { ...process.env, GIT_AUTHOR_NAME: gitName, GIT_AUTHOR_EMAIL: gitEmail, GIT_COMMITTER_NAME: gitName, GIT_COMMITTER_EMAIL: gitEmail };

    if (files && files.length > 0) {
      for (const f of files) {
        await execAsync(`git add -- "${f}"`, { cwd: safe, env });
      }
    } else {
      await execAsync("git add -A", { cwd: safe, env });
    }

    const { stdout } = await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: safe, env });
    return NextResponse.json({ success: true, output: stdout });
  } catch (err: unknown) {
    const e = err as { stderr?: string; message?: string };
    return NextResponse.json({ error: e.stderr ?? e.message ?? "Commit failed" }, { status: 500 });
  }
}
```

- [ ] **Step 8: Create git push route**

`src/app/api/git/push/route.ts`:

```ts
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { validatePath } from "@/lib/files";
import { requireAuth } from "@/lib/auth";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { path: repoPath } = await req.json();
    if (!repoPath) return NextResponse.json({ error: "path required" }, { status: 400 });
    const safe = validatePath(repoPath);
    const { stdout, stderr } = await execAsync("git push", { cwd: safe, timeout: 30000 });
    return NextResponse.json({ success: true, output: stdout || stderr });
  } catch (err: unknown) {
    const e = err as { stderr?: string; message?: string };
    return NextResponse.json({ error: e.stderr ?? e.message ?? "Push failed" }, { status: 500 });
  }
}
```

- [ ] **Step 9: Commit**

```bash
git add src/app/api/files/ src/app/api/git/ src/lib/files.ts
git commit -m "feat(api): file CRUD + git status/commit/push API routes"
```

---

## Task 6: Sidebar File Tree + Git UI (Group C2 frontend)

**Files:**
- Create: `src/components/layout/FileTree.tsx`
- Create: `src/components/layout/ContextMenu.tsx`
- Create: `src/components/layout/CommitOverlay.tsx`
- Create: `src/components/layout/Toast.tsx`
- Rewrite: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Create Toast component**

`src/components/layout/Toast.tsx`:

```tsx
"use client";

import { useEffect } from "react";

interface Props {
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
}

export default function Toast({ message, type, onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div style={{
      position: "fixed", bottom: "40px", right: "16px", zIndex: 2000,
      background: type === "success" ? "var(--success)" : "var(--danger)",
      color: "white", padding: "10px 16px", borderRadius: "8px",
      fontSize: "13px", maxWidth: "320px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      display: "flex", alignItems: "center", gap: "10px",
    }}>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onDismiss} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}>×</button>
    </div>
  );
}
```

- [ ] **Step 2: Create ContextMenu component**

`src/components/layout/ContextMenu.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  action: () => void;
  danger?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: "fixed", left: x, top: y, zIndex: 3000,
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      minWidth: "160px", overflow: "hidden",
    }}>
      {items.map((item) => (
        <button key={item.label} onClick={() => { item.action(); onClose(); }} style={{
          display: "block", width: "100%", textAlign: "left",
          padding: "8px 14px", border: "none", background: "transparent",
          color: item.danger ? "var(--danger)" : "var(--text)",
          cursor: "pointer", fontSize: "13px",
        }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          {item.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create CommitOverlay**

`src/components/layout/CommitOverlay.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

interface Change {
  status: string;
  path: string;
}

interface Props {
  repoPath: string;
  changes: Change[];
  onClose: () => void;
  onCommitted: () => void;
}

export default function CommitOverlay({ repoPath, changes, onClose, onCommitted }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(changes.map(c => c.path)));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleFile(path: string) {
    setSelected(s => {
      const next = new Set(s);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function handleCommit() {
    if (!message.trim()) { setError("Commit message required"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/git/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: repoPath, message: message.trim(), files: [...selected] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onCommitted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Commit failed");
    } finally {
      setLoading(false);
    }
  }

  const statusColor = (s: string) => s.startsWith("M") ? "var(--warning)" : s.startsWith("D") ? "var(--danger)" : "var(--success)";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", width: "480px", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600" }}>Commit Changes</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "18px" }}>×</button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
          <div style={{ marginBottom: "12px" }}>
            {changes.map(c => (
              <label key={c.path} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", cursor: "pointer", fontSize: "13px" }}>
                <input type="checkbox" checked={selected.has(c.path)} onChange={() => toggleFile(c.path)} />
                <span style={{ color: statusColor(c.status), fontWeight: 600, width: "16px" }}>{c.status}</span>
                <span style={{ color: "var(--text)", fontFamily: "monospace", fontSize: "12px" }}>{c.path}</span>
              </label>
            ))}
          </div>
          <textarea
            value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Commit message…"
            style={{ width: "100%", height: "80px", resize: "vertical", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", color: "var(--text)", fontSize: "13px" }}
          />
          {error && <p style={{ color: "var(--danger)", fontSize: "13px", marginTop: "8px" }}>{error}</p>}
        </div>
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleCommit} className="btn-primary" disabled={loading || selected.size === 0}>
            {loading ? "Committing…" : `Commit ${selected.size} file${selected.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create FileTree component**

`src/components/layout/FileTree.tsx`:

```tsx
"use client";

import { useState } from "react";
import ContextMenu, { ContextMenuItem } from "./ContextMenu";

interface TreeItem {
  name: string;
  path: string;
  type: "file" | "dir";
}

interface GitChange {
  status: string;
  path: string;
}

interface Props {
  items: TreeItem[];
  basePath: string;
  gitChanges: GitChange[];
  depth?: number;
  onFileClick: (path: string) => void;
  onRefresh: () => void;
}

export default function FileTree({ items, basePath, gitChanges, depth = 0, onFileClick, onRefresh }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [children, setChildren] = useState<Record<string, TreeItem[]>>({});
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: TreeItem } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  async function loadChildren(dirPath: string) {
    const res = await fetch(`/api/files?path=${encodeURIComponent(dirPath)}`);
    const json = await res.json();
    setChildren(c => ({ ...c, [dirPath]: json.items ?? [] }));
  }

  function toggleDir(item: TreeItem) {
    setExpanded(s => {
      const next = new Set(s);
      if (next.has(item.path)) { next.delete(item.path); }
      else { next.add(item.path); loadChildren(item.path); }
      return next;
    });
  }

  function getStatusBadge(itemPath: string, type: "file" | "dir") {
    const rel = itemPath.replace(basePath, "").replace(/^\//, "");
    const match = gitChanges.find(c => c.path === rel || (type === "dir" && c.path.startsWith(rel + "/")));
    if (!match) return null;
    const color = match.status.startsWith("M") ? "var(--warning)" : match.status.startsWith("D") ? "var(--danger)" : "var(--success)";
    return <span style={{ fontSize: "10px", fontWeight: 700, color, marginLeft: "auto" }}>{type === "dir" ? "●" : match.status}</span>;
  }

  async function handleAction(action: string, item: TreeItem, value?: string) {
    if (action === "newfile") {
      const name = prompt("File name:");
      if (!name) return;
      await fetch("/api/files/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "newfile", path: item.path, name }) });
      if (item.type === "dir") { await loadChildren(item.path); setExpanded(s => new Set([...s, item.path])); }
      else onRefresh();
    } else if (action === "mkdir") {
      const name = prompt("Folder name:");
      if (!name) return;
      await fetch("/api/files/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mkdir", path: item.path, name }) });
      if (item.type === "dir") { await loadChildren(item.path); setExpanded(s => new Set([...s, item.path])); }
      else onRefresh();
    } else if (action === "delete") {
      if (!confirm(`Delete "${item.name}"?`)) return;
      await fetch("/api/files/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", path: item.path }) });
      onRefresh();
    } else if (action === "rename" && value) {
      const newPath = item.path.replace(/[^/]+$/, value);
      await fetch("/api/files/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "rename", path: item.path, newPath }) });
      setRenaming(null);
      onRefresh();
    }
  }

  return (
    <>
      {items.map(item => (
        <div key={item.path}>
          <div
            onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, item }); }}
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: `3px 8px 3px ${8 + depth * 12}px`, cursor: "pointer", borderRadius: "4px", fontSize: "12px" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            onClick={() => item.type === "dir" ? toggleDir(item) : onFileClick(item.path)}>
            <span style={{ color: item.type === "dir" ? "var(--accent)" : "var(--muted)", fontSize: "11px", width: "14px" }}>
              {item.type === "dir" ? (expanded.has(item.path) ? "▾" : "▸") : "·"}
            </span>
            {renaming === item.path ? (
              <input autoFocus value={newName}
                onChange={e => setNewName(e.target.value)}
                onBlur={() => setRenaming(null)}
                onKeyDown={e => { if (e.key === "Enter") handleAction("rename", item, newName); if (e.key === "Escape") setRenaming(null); }}
                onClick={e => e.stopPropagation()}
                style={{ fontSize: "12px", padding: "1px 4px", background: "var(--bg)", border: "1px solid var(--accent)", borderRadius: "3px", color: "var(--text)", width: "120px" }} />
            ) : (
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>{item.name}</span>
            )}
            {getStatusBadge(item.path, item.type)}
          </div>

          {item.type === "dir" && expanded.has(item.path) && children[item.path] && (
            <FileTree
              items={children[item.path]}
              basePath={basePath}
              gitChanges={gitChanges}
              depth={depth + 1}
              onFileClick={onFileClick}
              onRefresh={() => loadChildren(item.path)}
            />
          )}
        </div>
      ))}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            ...(contextMenu.item.type === "dir" ? [
              { label: "New File", action: () => handleAction("newfile", contextMenu.item) },
              { label: "New Folder", action: () => handleAction("mkdir", contextMenu.item) },
            ] : []),
            { label: "Rename", action: () => { setRenaming(contextMenu.item.path); setNewName(contextMenu.item.name); } },
            { label: "Delete", action: () => handleAction("delete", contextMenu.item), danger: true },
          ] as ContextMenuItem[]}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 5: Rewrite Sidebar**

Replace `src/components/layout/Sidebar.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import FileTree from "./FileTree";
import CommitOverlay from "./CommitOverlay";
import Toast from "./Toast";

interface Project {
  id: string;
  name: string;
  path: string;
}

interface TreeItem {
  name: string;
  path: string;
  type: "file" | "dir";
}

interface GitChange {
  status: string;
  path: string;
}

interface Props {
  activeProject: string | null;
  onSelectProject: (path: string) => void;
  onOpenFile?: (path: string) => void;
}

export default function Sidebar({ activeProject, onSelectProject, onOpenFile }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [rootItems, setRootItems] = useState<TreeItem[]>([]);
  const [gitChanges, setGitChanges] = useState<GitChange[]>([]);
  const [showCommit, setShowCommit] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const repoPath = activeProject ?? "/app";

  useEffect(() => {
    fetch("/api/projects").then(r => r.json()).then(d => setProjects(d.projects ?? [])).catch(() => {});
  }, []);

  const loadRootItems = useCallback(async () => {
    const res = await fetch(`/api/files?path=${encodeURIComponent(repoPath)}`);
    const json = await res.json();
    setRootItems(json.items ?? []);
  }, [repoPath]);

  const loadGitStatus = useCallback(async () => {
    const res = await fetch(`/api/git/status?path=${encodeURIComponent(repoPath)}`);
    const json = await res.json();
    setGitChanges(json.changes ?? []);
  }, [repoPath]);

  useEffect(() => {
    loadRootItems();
    loadGitStatus();
  }, [loadRootItems, loadGitStatus]);

  async function handlePush() {
    setPushing(true);
    try {
      const res = await fetch("/api/git/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: repoPath }),
      });
      const json = await res.json();
      if (res.ok) setToast({ message: "Pushed successfully", type: "success" });
      else setToast({ message: json.error ?? "Push failed", type: "error" });
    } catch {
      setToast({ message: "Push failed", type: "error" });
    } finally {
      setPushing(false);
    }
  }

  const sectionLabel: React.CSSProperties = {
    padding: "8px 12px 4px",
    fontSize: "11px", fontWeight: 600, color: "var(--muted)",
    textTransform: "uppercase", letterSpacing: "0.08em",
  };

  return (
    <aside style={{ width: "220px", background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
      {/* Projects list */}
      <div style={sectionLabel}>Projects</div>
      <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "4px" }}>
        {/* ForgeOS root */}
        <button onClick={() => onSelectProject("/app")} style={{
          display: "flex", alignItems: "center", gap: "6px", width: "100%", textAlign: "left",
          padding: "6px 12px", border: "none", borderRadius: "4px",
          background: repoPath === "/app" ? "rgba(59,130,246,0.15)" : "transparent",
          color: repoPath === "/app" ? "var(--accent)" : "var(--text)", fontSize: "12px", fontWeight: 600, cursor: "pointer",
        }}>
          <span style={{ fontSize: "11px" }}>⬡</span> ForgeOS
        </button>
        {projects.map(p => (
          <button key={p.id} onClick={() => onSelectProject(p.path)} style={{
            display: "flex", alignItems: "center", gap: "6px", width: "100%", textAlign: "left",
            padding: "6px 12px 6px 20px", border: "none", borderRadius: "4px",
            background: activeProject === p.path ? "rgba(59,130,246,0.15)" : "transparent",
            color: activeProject === p.path ? "var(--accent)" : "var(--text)", fontSize: "12px", cursor: "pointer",
          }}>
            <span style={{ fontSize: "11px" }}>📁</span> {p.name}
          </button>
        ))}
      </div>

      {/* File tree */}
      <div style={{ flex: 1, overflow: "auto", paddingTop: "4px" }}>
        <FileTree
          items={rootItems}
          basePath={repoPath}
          gitChanges={gitChanges}
          onFileClick={(path) => onOpenFile?.(path)}
          onRefresh={() => { loadRootItems(); loadGitStatus(); }}
        />
      </div>

      {/* Git actions — only shown when there are changes */}
      {gitChanges.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "8px 10px", display: "flex", gap: "6px" }}>
          <button onClick={() => setShowCommit(true)} className="btn-primary" style={{ flex: 1, fontSize: "12px", padding: "6px" }}>
            Commit ({gitChanges.length})
          </button>
          <button onClick={handlePush} className="btn-secondary" style={{ flex: 1, fontSize: "12px", padding: "6px" }} disabled={pushing}>
            {pushing ? "…" : "Push"}
          </button>
        </div>
      )}

      {showCommit && (
        <CommitOverlay
          repoPath={repoPath}
          changes={gitChanges}
          onClose={() => setShowCommit(false)}
          onCommitted={() => { setShowCommit(false); loadGitStatus(); setToast({ message: "Committed successfully", type: "success" }); }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </aside>
  );
}
```

- [ ] **Step 6: Wire onOpenFile through DashboardShell**

In `DashboardShell.tsx`, add `openFile` state and wire it:

```tsx
// Add to DashboardShell state:
const [openFilePath, setOpenFilePath] = useState<string | null>(null);

// Update Sidebar:
<Sidebar
  activeProject={activeProject}
  onSelectProject={setActiveProject}
  onOpenFile={setOpenFilePath}
/>

// Update PanelGrid:
<PanelGrid activeProject={activeProject} layout={layout} openFilePath={openFilePath} />
```

- [ ] **Step 7: Build and verify**

```bash
npm run build
# Visit dashboard — sidebar should show ForgeOS + /workspace projects
# Click a directory — should expand with files
# Right-click a file — context menu: New File, Rename, Delete
# Edit a file in terminal, refresh sidebar — should show M badge
# Click Commit → CommitOverlay with file list and message field
```

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/components/layout/FileTree.tsx \
        src/components/layout/ContextMenu.tsx src/components/layout/CommitOverlay.tsx \
        src/components/layout/Toast.tsx
git commit -m "feat(sidebar): file tree with git status badges, commit/push UI"
```

---

## Task 7: Panel System — Tab Groups (Group C3)

**Files:**
- Create: `src/components/layout/TabBar.tsx`
- Create: `src/components/layout/TabGroup.tsx`
- Create: `src/components/layout/SplitPane.tsx`
- Create: `src/components/chat/ChatPanel.tsx`
- Rewrite: `src/components/layout/PanelGrid.tsx`

- [ ] **Step 1: Define shared types**

Create `src/components/layout/panel-types.ts`:

```ts
export type PanelType = "terminal" | "chat-claude" | "chat-codex" | "editor" | "viewer";
export type LayoutMode = "single" | "split-h" | "split-v";

export interface TabItem {
  id: string;
  type: PanelType;
  title: string;
  filePath?: string;   // for editor/viewer tabs
  dirty?: boolean;     // unsaved changes
}

export interface GroupState {
  tabs: TabItem[];
  activeTabId: string;
}

export interface LayoutState {
  mode: LayoutMode;
  groupA: GroupState;
  groupB: GroupState;
  splitRatio: number;  // 0.0–1.0, fraction for groupA
}

export function defaultTab(type: PanelType, filePath?: string): TabItem {
  const titles: Record<PanelType, string> = {
    terminal: "Terminal",
    "chat-claude": "Claude",
    "chat-codex": "Codex",
    editor: filePath ? filePath.split("/").pop() ?? "Editor" : "Editor",
    viewer: filePath ? filePath.split("/").pop() ?? "Viewer" : "Viewer",
  };
  return { id: crypto.randomUUID(), type, title: titles[type], filePath, dirty: false };
}

export function defaultLayout(): LayoutState {
  const tab = defaultTab("terminal");
  return {
    mode: "single",
    groupA: { tabs: [tab], activeTabId: tab.id },
    groupB: { tabs: [defaultTab("chat-claude")], activeTabId: "" },
    splitRatio: 0.5,
  };
}

const STORAGE_KEY = "forgeos_layout_v1";

export function loadLayout(): LayoutState {
  if (typeof window === "undefined") return defaultLayout();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LayoutState;
  } catch { /* ignore */ }
  return defaultLayout();
}

export function saveLayout(state: LayoutState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
```

- [ ] **Step 2: Create TabBar component**

`src/components/layout/TabBar.tsx`:

```tsx
"use client";

import { TabItem, PanelType } from "./panel-types";

interface Props {
  tabs: TabItem[];
  activeTabId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onAdd: (type: PanelType) => void;
}

const PANEL_ICONS: Record<PanelType, string> = {
  terminal: ">_",
  "chat-claude": "◆",
  "chat-codex": "◇",
  editor: "✎",
  viewer: "👁",
};

export default function TabBar({ tabs, activeTabId, onSelect, onClose, onAdd }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", background: "var(--surface)", borderBottom: "1px solid var(--border)", height: "32px", flexShrink: 0, overflow: "hidden" }}>
      {tabs.map(tab => (
        <div key={tab.id} onClick={() => onSelect(tab.id)}
          style={{ display: "flex", alignItems: "center", gap: "4px", padding: "0 10px", height: "100%", cursor: "pointer", borderRight: "1px solid var(--border)", fontSize: "12px", background: tab.id === activeTabId ? "var(--bg)" : "transparent", color: tab.id === activeTabId ? "var(--text)" : "var(--muted)", flexShrink: 0, maxWidth: "150px" }}>
          <span style={{ fontSize: "10px" }}>{PANEL_ICONS[tab.type]}</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tab.dirty ? "• " : ""}{tab.title}
          </span>
          {tabs.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); onClose(tab.id); }}
              style={{ marginLeft: "2px", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "12px", lineHeight: 1, padding: "0 2px" }}>×</button>
          )}
        </div>
      ))}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <button
          onClick={() => onAdd("terminal")}
          title="Add terminal"
          style={{ height: "32px", padding: "0 10px", border: "none", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: "16px" }}>+</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create ChatPanel placeholder**

`src/components/chat/ChatPanel.tsx`:

```tsx
"use client";

interface Props {
  provider: "claude" | "codex";
  projectPath: string | null;
}

export default function ChatPanel({ provider, projectPath }: Props) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted)", gap: "8px" }}>
      <div style={{ fontSize: "32px" }}>{provider === "claude" ? "◆" : "◇"}</div>
      <p style={{ fontSize: "14px", fontWeight: 600 }}>{provider === "claude" ? "Claude" : "Codex"} Chat</p>
      <p style={{ fontSize: "12px", textAlign: "center", maxWidth: "240px" }}>
        AI chat integration coming soon. Use the terminal to run{" "}
        <code style={{ fontFamily: "monospace", background: "var(--bg)", padding: "1px 4px", borderRadius: "3px" }}>
          {provider === "claude" ? "claude" : "codex"}
        </code>{" "}
        for now.
      </p>
      {projectPath && <p style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "monospace" }}>{projectPath}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Create SplitPane**

`src/components/layout/SplitPane.tsx`:

```tsx
"use client";

import { useCallback, useRef } from "react";

interface Props {
  direction: "horizontal" | "vertical";
  ratio: number; // 0.0–1.0
  onRatioChange: (r: number) => void;
  first: React.ReactNode;
  second: React.ReactNode;
}

export default function SplitPane({ direction, ratio, onRatioChange, first, second }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onMouseDown = useCallback(() => {
    dragging.current = true;

    function onMove(e: MouseEvent) {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let r: number;
      if (direction === "horizontal") {
        r = (e.clientX - rect.left) / rect.width;
      } else {
        r = (e.clientY - rect.top) / rect.height;
      }
      onRatioChange(Math.max(0.15, Math.min(0.85, r)));
    }

    function onUp() {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [direction, onRatioChange]);

  const isH = direction === "horizontal";
  const firstSize = `${ratio * 100}%`;
  const splitterStyle: React.CSSProperties = {
    flexShrink: 0,
    background: "var(--border)",
    cursor: isH ? "col-resize" : "row-resize",
    ...(isH ? { width: "4px", height: "100%" } : { width: "100%", height: "4px" }),
  };

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: isH ? "row" : "column", flex: 1, overflow: "hidden" }}>
      <div style={{ ...(isH ? { width: firstSize } : { height: firstSize }), display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {first}
      </div>
      <div style={splitterStyle} onMouseDown={onMouseDown} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {second}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create TabGroup**

`src/components/layout/TabGroup.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";
import TabBar from "./TabBar";
import { GroupState, TabItem, PanelType, defaultTab } from "./panel-types";
import ChatPanel from "@/components/chat/ChatPanel";

const TerminalPanel = dynamic(() => import("@/components/terminal/TerminalPanel"), { ssr: false });
const EditorPanel = dynamic(() => import("@/components/editor/EditorPanel"), { ssr: false });

interface Props {
  group: GroupState;
  projectPath: string | null;
  onGroupChange: (g: GroupState) => void;
  openFilePath?: string | null;
}

export default function TabGroup({ group, projectPath, onGroupChange, openFilePath }: Props) {
  const activeTab = group.tabs.find(t => t.id === group.activeTabId) ?? group.tabs[0];

  // Open file in new viewer tab if requested
  if (openFilePath && !group.tabs.find(t => t.filePath === openFilePath)) {
    const tab = defaultTab("viewer", openFilePath);
    const newTabs = [...group.tabs, tab];
    onGroupChange({ tabs: newTabs, activeTabId: tab.id });
  }

  function selectTab(id: string) {
    onGroupChange({ ...group, activeTabId: id });
  }

  function closeTab(id: string) {
    const tab = group.tabs.find(t => t.id === id);
    if (tab?.dirty && !confirm("Unsaved changes — close anyway?")) return;
    const newTabs = group.tabs.filter(t => t.id !== id);
    if (newTabs.length === 0) {
      const fallback = defaultTab("terminal");
      onGroupChange({ tabs: [fallback], activeTabId: fallback.id });
      return;
    }
    const newActive = id === group.activeTabId ? newTabs[newTabs.length - 1].id : group.activeTabId;
    onGroupChange({ tabs: newTabs, activeTabId: newActive });
  }

  function addTab(type: PanelType) {
    const tab = defaultTab(type);
    onGroupChange({ tabs: [...group.tabs, tab], activeTabId: tab.id });
  }

  function updateTab(id: string, changes: Partial<TabItem>) {
    onGroupChange({ ...group, tabs: group.tabs.map(t => t.id === id ? { ...t, ...changes } : t) });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <TabBar
        tabs={group.tabs}
        activeTabId={activeTab?.id ?? ""}
        onSelect={selectTab}
        onClose={closeTab}
        onAdd={addTab}
      />
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {activeTab?.type === "terminal" && (
          <TerminalPanel projectPath={projectPath ? projectPath : "/workspace"} />
        )}
        {(activeTab?.type === "chat-claude" || activeTab?.type === "chat-codex") && (
          <ChatPanel provider={activeTab.type === "chat-claude" ? "claude" : "codex"} projectPath={projectPath} />
        )}
        {(activeTab?.type === "editor" || activeTab?.type === "viewer") && activeTab.filePath && (
          <EditorPanel
            filePath={activeTab.filePath}
            readOnly={activeTab.type === "viewer"}
            onDirtyChange={(dirty) => updateTab(activeTab.id, { dirty, type: dirty ? "editor" : activeTab.type })}
            onModeChange={(mode) => updateTab(activeTab.id, { type: mode })}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Rewrite PanelGrid**

Replace `src/components/layout/PanelGrid.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import SplitPane from "./SplitPane";
import TabGroup from "./TabGroup";
import { LayoutMode, LayoutState, GroupState, loadLayout, saveLayout, defaultLayout } from "./panel-types";

interface Props {
  activeProject: string | null;
  layout: LayoutMode;
  openFilePath?: string | null;
}

export default function PanelGrid({ activeProject, layout, openFilePath }: Props) {
  const [state, setState] = useState<LayoutState>(defaultLayout);

  useEffect(() => {
    setState(loadLayout());
  }, []);

  useEffect(() => {
    setState(s => ({ ...s, mode: layout }));
  }, [layout]);

  useEffect(() => {
    saveLayout(state);
  }, [state]);

  function updateGroupA(g: GroupState) {
    setState(s => ({ ...s, groupA: g }));
  }
  function updateGroupB(g: GroupState) {
    setState(s => ({ ...s, groupB: g }));
  }

  const groupA = (
    <TabGroup
      group={state.groupA}
      projectPath={activeProject}
      onGroupChange={updateGroupA}
      openFilePath={openFilePath}
    />
  );
  const groupB = (
    <TabGroup
      group={state.groupB}
      projectPath={activeProject}
      onGroupChange={updateGroupB}
    />
  );

  if (state.mode === "single") {
    return <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>{groupA}</div>;
  }

  return (
    <SplitPane
      direction={state.mode === "split-h" ? "horizontal" : "vertical"}
      ratio={state.splitRatio}
      onRatioChange={(r) => setState(s => ({ ...s, splitRatio: r }))}
      first={groupA}
      second={groupB}
    />
  );
}
```

- [ ] **Step 7: Build and verify**

```bash
npm run build
# Dashboard: single panel shows terminal
# Click ⬜⬜ in MenuBar → split-h: two side-by-side panels
# Click + in tab bar → adds terminal tab
# Click × on tab → closes it
# Drag splitter → resizes panels
# Reload page → layout preserved from localStorage
```

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/panel-types.ts src/components/layout/TabBar.tsx \
        src/components/layout/TabGroup.tsx src/components/layout/SplitPane.tsx \
        src/components/layout/PanelGrid.tsx src/components/chat/ChatPanel.tsx \
        src/components/layout/DashboardShell.tsx
git commit -m "feat(panels): tab-group panel system with split layouts and localStorage persistence"
```

---

## Task 8: CodeMirror Viewer/Editor (Group C4)

**Files:**
- Create: `src/components/editor/EditorPanel.tsx`

- [ ] **Step 1: Install CodeMirror packages**

```bash
npm install codemirror @codemirror/view @codemirror/state @codemirror/language \
  @codemirror/lang-javascript @codemirror/lang-css @codemirror/lang-html \
  @codemirror/lang-json @codemirror/lang-markdown @codemirror/lang-python \
  @codemirror/lang-rust @codemirror/lang-sql @codemirror/theme-one-dark \
  @codemirror/commands @lezer/highlight
```

- [ ] **Step 2: Create EditorPanel**

`src/components/editor/EditorPanel.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { oneDark } from "@codemirror/theme-one-dark";

type PanelMode = "viewer" | "editor";

interface Props {
  filePath: string;
  readOnly: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onModeChange: (mode: PanelMode) => void;
}

function getLanguage(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (["js", "ts", "jsx", "tsx", "mjs", "cjs"].includes(ext)) return javascript({ typescript: ext.startsWith("t") || ext === "tsx" });
  if (ext === "css") return css();
  if (["html", "htm"].includes(ext)) return html();
  if (ext === "json") return json();
  if (["md", "mdx"].includes(ext)) return markdown();
  if (ext === "py") return python();
  if (ext === "sql") return sql();
  return javascript(); // fallback
}

export default function EditorPanel({ filePath, readOnly, onDirtyChange, onModeChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const filename = filePath.split("/").pop() ?? filePath;

  // Load file
  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`)
      .then(r => r.json())
      .then(json => { if (json.content !== undefined) setContent(json.content); else setError(json.error ?? "Failed"); })
      .catch(() => setError("Failed to load file"))
      .finally(() => setLoading(false));
  }, [filePath]);

  // Init/reinit CodeMirror when content or readOnly changes
  useEffect(() => {
    if (loading || !containerRef.current) return;

    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const state = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        getLanguage(filePath),
        oneDark,
        EditorView.editable.of(!readOnly),
        EditorView.updateListener.of(update => {
          if (update.docChanged && !readOnly) {
            const isDirty = update.state.doc.toString() !== content;
            setDirty(isDirty);
            onDirtyChange(isDirty);
          }
        }),
        EditorView.theme({ "&": { height: "100%" }, ".cm-scroller": { overflow: "auto" } }),
      ],
    });

    viewRef.current = new EditorView({ state, parent: containerRef.current });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [content, readOnly, loading, filePath]); // eslint-disable-line

  const handleSave = useCallback(async () => {
    if (!viewRef.current) return;
    const newContent = viewRef.current.state.doc.toString();
    setSaving(true);
    try {
      const res = await fetch("/api/files/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, content: newContent }),
      });
      if (res.ok) {
        setContent(newContent);
        setDirty(false);
        onDirtyChange(false);
      }
    } finally {
      setSaving(false);
    }
  }, [filePath, onDirtyChange]);

  // Ctrl+S to save
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && !readOnly) {
        e.preventDefault();
        handleSave();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handleSave, readOnly]);

  if (loading) return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>Loading…</div>;
  if (error) return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--danger)" }}>{error}</div>;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 12px", background: "var(--surface)", borderBottom: "1px solid var(--border)", flexShrink: 0, height: "32px" }}>
        <span style={{ fontSize: "12px", color: "var(--muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {dirty ? "• " : ""}{filename}
        </span>
        {readOnly ? (
          <button onClick={() => onModeChange("editor")} className="btn-secondary" style={{ fontSize: "11px", padding: "2px 10px" }}>Bearbeiten</button>
        ) : (
          <>
            <button onClick={handleSave} className="btn-primary" style={{ fontSize: "11px", padding: "2px 10px" }} disabled={saving || !dirty}>
              {saving ? "…" : "Speichern"}
            </button>
            <button onClick={() => {
              if (dirty && !confirm("Unsaved changes — close?")) return;
              onModeChange("viewer");
            }} className="btn-secondary" style={{ fontSize: "11px", padding: "2px 10px" }}>Schließen</button>
          </>
        )}
      </div>
      {/* Editor */}
      <div ref={containerRef} style={{ flex: 1, overflow: "hidden" }} />
    </div>
  );
}
```

- [ ] **Step 3: Build and verify**

```bash
npm run build
# Click a file in sidebar → opens in viewer tab with syntax highlighting
# Click Bearbeiten → editor mode
# Make a change → title shows • prefix
# Ctrl+S → saves, • removed
# Click Schließen with unsaved changes → confirm dialog
```

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/ package.json package-lock.json
git commit -m "feat(editor): CodeMirror 6 viewer/editor with syntax highlighting and save"
```

---

## Task 9: Docs (Groups D1 + D2)

**Files:**
- Create: `README.md`
- Modify: `ARCHITECTURE.md`

- [ ] **Step 1: Create README.md**

```markdown
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
```

- [ ] **Step 2: Update ARCHITECTURE.md**

Read the current `ARCHITECTURE.md` and update it:
- Change all `[ ]` items that are now implemented to `[x]`
- Correct references to `forge` user → `root` (runs as root)
- Add new section: **Phase 2 Features** listing panel system, settings overlay, extended auth, sidebar + git integration, CodeMirror editor, two-layer AI memory
- Update the volumes table to match actual mount points (`/root/` not `/home/forge/`)

Key corrections to make:
```markdown
# Change /home/forge/.forgeos → /root/.forgeos
# Change /home/forge/.claude → /root/.claude
# Change /home/forge/.ssh → /root/.ssh
# Change /home/forge/.config/gh → /root/.config/gh
# Remove non-root/forge user references
# Mark Phase 1 implemented items as [x]
```

- [ ] **Step 3: Commit**

```bash
git add README.md ARCHITECTURE.md
git commit -m "docs: add README, update ARCHITECTURE with Phase 2 features and current state"
```

---

## Task 10: Final Build + Verification

- [ ] **Step 1: Full production build**

```bash
npm run build
```

Expected: no TypeScript errors, no Next.js build errors.

- [ ] **Step 2: Smoke test checklist**

```
□ /setup — redirects to /login if already configured
□ /login — log in, see name in user menu top-right
□ User menu dropdown — opens, shows Profil / Globale Einstellungen / Projekt-Einstellungen / Ausloggen
□ Global Settings overlay — opens, shows Git/Claude/Codex tabs, ESC closes
□ Sidebar — shows ForgeOS root, file tree expands, right-click shows context menu
□ Sidebar: modify a file in terminal → M badge appears, Commit button visible
□ CommitOverlay — opens with file list + message field, commits successfully
□ Push button — runs git push, shows toast
□ PanelGrid: single layout — one terminal panel
□ Layout toggle → split-h: two panels side by side, splitter draggable
□ Tab + button: adds new tab, × closes it
□ Click file in sidebar → opens viewer tab with syntax highlighting
□ Click Bearbeiten → edit mode; make change → • in title; Ctrl+S saves
□ docs/ai-context/ files present in repo
□ /root/.forgeos/ai-memory/MEMORY.md exists
□ CLAUDE.md references both memory layers
□ AGENTS.md present
□ README.md present
```

- [ ] **Step 3: Git push**

```bash
git push origin main
```

---

## Notes

- **CodeMirror** must be dynamically imported or it will SSR-fail. `EditorPanel` is already client-only but TabGroup imports it with `dynamic(..., { ssr: false })` as a precaution.
- **node-pty** is in `serverExternalPackages` — never import in client components.
- **File path safety**: all file API routes call `validatePath()` which restricts access to `/app` and `/workspace`.
- **Setup security**: `/setup` page redirects server-side. `/api/setup/*` routes return 410 after completion. Both guards are independent.
- **localStorage layout**: `forgeos_layout_v1` key. If corrupted, `loadLayout()` falls back to `defaultLayout()`.
- **Git identity**: commit route reads `git_user_name` / `git_user_email` from Config table. If not set, defaults to `ForgeOS / forgeos@localhost`.
