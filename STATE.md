# ForgeOS — Project State

## Zuletzt erledigt
Phase 2 (Terminal + StatusBar) — ResizeObserver-Bug gefixt, Empty State für PanelGrid, Git-Branch-API, StatusBar mit Live-Daten, Orchestrator aus DB laden.

## Stand
Phase 1 vollständig. Phase 2 teilweise:
- Terminal: xterm.js + WebSocket PTY voll funktionsfähig, Memory-Leaks gefixt
- PanelGrid: Empty State wenn kein Projekt ausgewählt (kein PTY-Spawn mehr)
- StatusBar: zeigt Orchestrator, Projektname, Git-Branch (live, alle 5s)
- Orchestrator wird beim Mount aus DB geladen

## Nächster Schritt
Phase 2 fortsetzen:
- AI Chat Panel mit Stream-Transport
- File Editor (CodeMirror)
- Preview Panel (optional)
