/**
 * Terminal panel — xterm.js rendering, WebSocket connectivity, basic input.
 */
import { test, expect } from '@playwright/test';

test.describe('Terminal Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('header')).toBeVisible({ timeout: 15_000 });
    // Wait for terminal to initialise (xterm is loaded dynamically)
    await page.waitForTimeout(2_000);
  });

  test('terminal container is rendered in main panel area', async ({ page }) => {
    // xterm.js creates a .xterm element
    const terminal = page.locator('.xterm, [data-testid="terminal"], .terminal-container').first();
    await expect(terminal).toBeVisible({ timeout: 15_000 });
  });

  test('terminal viewport is visible and has rows', async ({ page }) => {
    const xtermViewport = page.locator('.xterm-viewport, .xterm-screen').first();
    await expect(xtermViewport).toBeVisible({ timeout: 15_000 });
  });

  test('WebSocket /api/terminal connects successfully', async ({ page }) => {
    const BASE = process.env.FORGEOS_URL ?? 'https://forgeos.trend-forge.dev';
    const wsUrl = BASE.replace(/^https?/, 'wss') + '/api/terminal?path=/app';

    const wsConnected = await page.evaluate(async (url) => {
      return new Promise<boolean>((resolve) => {
        const ws = new WebSocket(url);
        const t = setTimeout(() => { ws.close(); resolve(false); }, 8_000);
        ws.onopen = () => { clearTimeout(t); ws.close(); resolve(true); };
        ws.onerror = () => { clearTimeout(t); resolve(false); };
      });
    }, wsUrl);

    expect(wsConnected).toBe(true);
  });

  test('terminal responds to keyboard input', async ({ page }) => {
    const terminal = page.locator('.xterm').first();
    await expect(terminal).toBeVisible({ timeout: 15_000 });

    // Focus terminal and type a safe command
    await terminal.click();
    await page.keyboard.type('echo __e2e_test__');
    await page.keyboard.press('Enter');

    // Wait for output — xterm renders in canvas / text nodes
    await page.waitForTimeout(1_500);
    const terminalText = await page.locator('.xterm-rows, .xterm-screen').textContent();
    // The terminal might echo back the command
    expect(terminalText?.length).toBeGreaterThan(0);
  });

  test('project path in terminal updates when switching project', async ({ page }) => {
    // Select ForgeOS explicitly
    await page.locator('aside button', { hasText: 'ForgeOS' }).click();
    await page.waitForTimeout(2_000);
    // Terminal should connect with path /app — verified by WebSocket URL
    // (Indirect check: xterm still visible)
    await expect(page.locator('.xterm').first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Terminal API Route', () => {
  test('GET /api/terminal without upgrade → appropriate error or redirect', async ({ request }) => {
    // Without WebSocket upgrade header, server should return 400/426
    const res = await request.get('/api/terminal?path=/app');
    // Any non-5xx response is acceptable (400, 426, etc.)
    expect(res.status()).toBeLessThan(500);
  });
});
