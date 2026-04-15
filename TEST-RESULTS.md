# ForgeOS E2E Test Results

**Testlauf:** 2026-04-14T12:19:11Z  
**Dauer:** ~4m 25s  
**Tool:** Playwright (e2e)  
**Ergebnis: 50 bestanden · 28 fehlgeschlagen · 2 übersprungen**

---

## Übersicht nach Kategorie

| # | Kategorie | Fehlgeschlagen | Root Cause |
|---|-----------|---------------|------------|
| A | Settings/Admin UI Navigation | 19 | UI auf Deutsch, Tests erwarten Englisch |
| B | Git API | 4 | Fehlende Auth-Guards, falsche Response-Formate, unbehandelte 500er |
| C | Terminal WebSocket | 2 | WebSocket 502 / Strict-Mode-Verletzung im Selector |
| D | Test-Isolation | 2 | Überbleibsel-Projekte aus vorherigen Läufen |
| E | Admin API Role Guard | 1 | DELETE-Endpoint liefert 404 statt 401/403 |

---

## Kategorie A — UI-Sprache: 19 Tests

**Root Cause:** Alle Tests suchen nach englischem Text (`/settings/i`, `settings|logout|sign out`) im User-Dropdown. Die UI rendert jedoch auf **Deutsch** (`"Globale Einstellungen"`, `"Ausloggen"`).

```
TimeoutError: locator.click: Timeout 5000ms exceeded.
  waiting for locator('text=/settings/i').first()
```

Die tatsächlichen Dropdown-Buttons laut Page-Snapshot:
- `button "Profil"`
- `button "Globale Einstellungen"`  ← Test sucht "settings"
- `button "Projekt-Einstellungen"`
- `button "Ausloggen"`              ← Test sucht "logout|sign out"

**Betroffene Test-Dateien:**

| Test-Datei | Fehlgeschlagene Tests |
|-----------|----------------------|
| `e2e/settings.spec.ts` | 10 Tests (opens via user menu, closes ×/Escape/backdrop, 5 Tab-Tests, Git-tab) |
| `e2e/admin.spec.ts` | 6 Tests (alle User-Management-Panel- und Invite-Panel-Tests) |
| `e2e/dashboard.spec.ts` | 1 Test (clicking user menu opens dropdown) |
| `e2e/git.spec.ts` | 1 Test (Git Settings tab, indirekt über openSettingsDialog helper) |

**Fix:** Entweder Locatoren auf Deutsch anpassen **oder** UI-Buttons konsistent auf Englisch setzen.

Vorschlag für Test-Locatoren:
```ts
// Statt:
await page.locator('text=/settings/i').first().click()
// Besser (exakter Button-Text):
await page.locator('button', { hasText: 'Globale Einstellungen' }).click()
// Oder robust mit data-testid:
await page.locator('[data-testid="open-settings"]').click()
```

---

## Kategorie B — Git API: 4 Tests

**Datei:** `e2e/git.spec.ts`

### B1 — Auth-Guard fehlt auf `/api/git/status`
```
Expected: 401
Received: 200
```
`GET /api/git/status` ohne Auth-Header gibt 200 zurück. Middleware fehlt.

### B2 — `/api/git/branch` gibt Objekt statt String zurück
```
Expected: "string"
Received: "object"
```
Der Endpoint antwortet mit `{ branch: null }` statt einem rohen String. Der Test erwartet `typeof branch === "string"`.

Relevante Route: `src/app/api/git/branch/route.ts:15` — gibt `{ branch: null }` zurück.

**Fix:** Entweder Test auf Objekt-Antwort anpassen (`body.branch`) oder Endpoint für `null`-Fall einen leeren String zurückgeben.

### B3 — `/api/git/commit` wirft 500 bei nicht-staged Files
```
Expected: < 500
Received:   500
```
POST ohne gestaged Files führt zu unbehandelter Exception. Error-Handling fehlt.

### B4 — `/api/git/push` wirft 500 bei fehlendem Remote
```
Expected: < 500
Received:   500
```
POST ohne konfiguriertes Remote führt zu unbehandelter Exception. Error-Handling fehlt.

**Fix für B3/B4:** Try/catch in den Route-Handlern, graceful error mit HTTP 400/422 zurückgeben.

---

## Kategorie C — Terminal WebSocket: 2 Tests + Console-Error

**Datei:** `e2e/terminal.spec.ts`, `e2e/clickable-audit.spec.ts`

### C1 — WebSocket-Verbindung schlägt fehl (502)
```
WebSocket connection to 'wss://forgeos.trend-forge.dev/api/terminal?path=%2Fworkspace' failed: 
  Error during WebSocket handshake: Unexpected response code: 502
```
Terminal-Service nicht erreichbar oder WebSocket-Proxy nicht korrekt konfiguriert. Tritt auch als Console-Error im `clickable-audit`-Test auf.

- Terminal-Test: `Expected: true / Received: false` (isConnected)
- Audit-Test: `Expected length: 0 / Received length: 1` (Console-Errors)

### C2 — Strict-Mode-Verletzung im Terminal-Selector
```
locator('.xterm-rows, .xterm-screen') resolved to 2 elements
```
Im DOM existieren sowohl `.xterm-screen` als auch `.xterm-rows`. Der Test nutzt `locator.textContent()` was strict mode voraussetzt.

**Fix C2:** Selector auf eine Klasse einschränken, z.B. `.xterm-rows` statt `.xterm-rows, .xterm-screen`.

---

## Kategorie D — Test-Isolation: 2 Tests

### D1 — Überbleibsel-Projekte in der Sidebar
**Datei:** `e2e/projects.spec.ts`
```
strict mode violation: locator('aside div').filter({ hasText: 'e2e-test-1776169291475' })
  .first().locator('button[title*="Delete"]') resolved to 5 elements
```
Aus vorherigen Testläufen sind `e2e-test-*`-Projekte in der Sidebar verblieben (4 Altprojekte + 1 neues). Der Locator matched alle.

**Ursache:** Test-Cleanup nach vorherigem Lauf ist fehlgeschlagen oder gar nicht vorhanden.

**Fix:** Teardown-Fixture, der alle `e2e-test-*`-Projekte bereinigt. Oder Locator auf exakten Title eingrenzen: `getByTitle('Delete e2e-test-1776169291475')` (unique ID statt Pattern-Match).

### D2 — Strict-Mode auf Login-Seite `<p>`-Tags
**Datei:** `e2e/login.spec.ts`
```
strict mode violation: locator('p') resolved to 2 elements:
  1) <p>Sign in to continue</p>
  2) <p>Invalid credentials</p>
```
**Inhaltlich hat der Test recht** — "Invalid credentials" wird korrekt angezeigt. Der Selector ist zu breit.

**Fix:** Spezifischeren Selector nutzen:
```ts
// Statt:
await expect(page.locator('p')).toContainText(/invalid|credentials|failed/i)
// Besser:
await expect(page.getByText(/invalid|credentials|failed/i)).toBeVisible()
```

---

## Kategorie E — Admin API Role Guard: 1 Test

**Datei:** `e2e/admin.spec.ts` — `DELETE /api/admin/users/:id requires admin`

```
Expected value: 404  (was in array [401, 403])
Received array: [401, 403]
```

**Hinweis:** Das ist ein **invertierter Test-Assertion-Fehler**. Der Test prüft:
```ts
expect([401, 403]).toContain(res.status())
```
...aber der tatsächliche Statuscode ist `404`. Die API liefert 404, weil der unauthentifizierte Request auf `nonexistent-id` trifft und das Endpoint den User vor der Auth-Prüfung sucht.

**Fix:** Auth/Role-Middleware muss **vor** der Datenbanksuche ausgeführt werden, sodass 401/403 vor 404 zurückgegeben wird.

---

## Passing Tests (50)

Alle folgenden Tests bestanden:

- `e2e/setup` — Admin-Authentifizierung
- `e2e/login.spec.ts` — Login-Page lädt, Login mit korrekten Credentials
- `e2e/dashboard.spec.ts` — Dashboard-Shell rendert Header, Sidebar, Terminal-Bereich
- `e2e/projects.spec.ts` — API-Tests (GET /api/projects, POST/DELETE)
- `e2e/admin.spec.ts` — Admin API-Tests (GET /api/admin/users, /api/admin/invites, POST invite)
- `e2e/git.spec.ts` — Authentifizierte Git-Status- und Branch-Anfragen
- `e2e/settings.spec.ts` — keine (alle UI-Tests fehlgeschlagen)
- `e2e/terminal.spec.ts` — keine (alle fehlgeschlagen)

---

## Prioritäten für Fehlerbehebung

| Prio | Kategorie | Aufwand | Impact |
|------|-----------|---------|--------|
| 1 | **A** — Settings-Locatoren (Deutsch) | Klein | 19 Tests grün |
| 2 | **B3/B4** — Git-Endpoint 500er | Klein | 2 Tests grün |
| 3 | **C1** — Terminal WebSocket 502 | Mittel | 3 Tests grün + kein Console-Error |
| 4 | **B1** — Git-Status Auth-Guard | Klein | 1 Test grün |
| 5 | **B2** — Branch-Response-Format | Klein | 1 Test grün |
| 6 | **D1** — Test-Cleanup (Projects) | Klein | 1 Test stabil |
| 7 | **D2** — Login-Selector | Minimal | 1 Test grün |
| 8 | **E** — Admin Delete Middleware-Reihenfolge | Klein | 1 Test grün |
| 9 | **C2** — Terminal Selector strict mode | Minimal | 1 Test grün (nach C1 fix) |
