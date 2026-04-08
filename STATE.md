# ForgeOS — Project State

## Zuletzt erledigt
Phase 3 (Permissions + Settings) — 4-stufiges Rollensystem, User-Management-Panel im Settings-Overlay, Role-Guards auf alle API-Routen.

## Stand
Phase 1 + Phase 2 + Phase 3 vollständig:
- Terminal: xterm.js + WebSocket PTY
- Chat: Streaming Claude/Codex Panel
- File Editor: CodeMirror 6, Syntax für TS/JS/Py/JSON/MD, ESC/Ctrl+S
- Dateibaum in Sidebar, expandierbare Verzeichnisse
- StatusBar: Orchestrator, Projekt, Git-Branch live
- Rollensystem: admin > developer > viewer > guest
  - requireRole(minRole) Guard in auth.ts
  - alle File/Git/Chat-APIs mit passenden Mindest-Rollen abgesichert
  - Neue User werden als "developer" registriert (war "user")
- User-Management: GlobalSettingsOverlay → Users-Tab (nur Admin)
  - Benutzerliste mit Rollenwechsel und Entfernen
  - Invite-System integriert (InvitePanel)
  - /api/admin/users GET / PATCH / DELETE
  - /api/auth/me → aktuellen User zurückgeben
- UserMenu: Role-Badge im Dropdown sichtbar

## Nächster Schritt
Phase 4: tbd (z.B. Projekt-Management, Benachrichtigungen, Dashboard-Widgets)
