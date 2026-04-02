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
