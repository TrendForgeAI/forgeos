# ForgeOS — Project State

## Zuletzt erledigt
Phase 4 (Projekt-Lifecycle + Activity-Log) — Projekte aus der UI anlegen/löschen, Branch-Badge in Sidebar, ProjectSettings mit Remote-URL, Activity-Log für alle Aktionen.

## Stand
Phase 1 + Phase 2 + Phase 3 + Phase 4 vollständig:
- Terminal: xterm.js + WebSocket PTY
- Chat: Streaming Claude/Codex Panel
- File Editor: CodeMirror 6, Syntax für TS/JS/Py/JSON/MD, ESC/Ctrl+S
- Dateibaum in Sidebar, expandierbare Verzeichnisse
- StatusBar: Orchestrator, Projekt, Git-Branch live
- Rollensystem: admin > developer > viewer > guest
  - requireRole(minRole) Guard in auth.ts
  - alle File/Git/Chat-APIs abgesichert
- User-Management: GlobalSettingsOverlay → Users-Tab (nur Admin)
- Projekt-Lifecycle:
  - POST /api/projects — git clone oder git init aus dem Browser
  - DELETE /api/projects/[id] — Verzeichnis + DB-Eintrag löschen (admin only)
  - PATCH /api/projects/[id] — Remote-URL aktualisieren
  - NewProjectModal in Sidebar ("+" Button)
  - Branch-Badge + Delete-Button pro Projekt in der Sidebar
  - ProjectSettingsOverlay: Name, Pfad, Branch, Remote-URL editierbar
- Activity-Log:
  - ActivityLog Prisma-Modell (max. 1000 Einträge)
  - Logging bei: Login, Commit, Push, Projekt anlegen/löschen
  - GET /api/activity — eigene Einträge (oder alle für Admin)
  - GlobalSettingsOverlay → Activity-Tab

## Nächster Schritt
Phase 5: tbd (z.B. Notifications/Websocket-Events, Dashboard-Widgets, Multi-Terminal-Tabs)
