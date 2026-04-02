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
