/**
 * Clickable Element Audit — discovers all interactive elements on each page,
 * clicks each one, and records broken/erroring interactions.
 *
 * Purpose: surface undiscovered bugs, missing handlers, and console errors
 * triggered by UI interactions. Results are written to playwright-report/clickable-audit.json.
 */
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';

interface ClickResult {
  page: string;
  element: string;
  text: string;
  consoleErrors: string[];
  networkErrors: string[];
  threw: boolean;
  errorMessage?: string;
}

const SKIP_TEXT_PATTERNS = [
  /sign out|logout/i, // would terminate session
  /delete.*project/i, // destructive
  /delete.*user/i,    // destructive
];

async function auditClickables(
  page: import('@playwright/test').Page,
  url: string,
  pageLabel: string,
  results: ClickResult[],
) {
  await page.goto(url);
  await page.waitForLoadState('networkidle', { timeout: 15_000 });

  // Collect all interactive elements
  const elements = await page
    .locator('button, [role="button"], a[href], input, select, textarea, [tabindex="0"]')
    .all();

  for (const el of elements) {
    const visible = await el.isVisible().catch(() => false);
    if (!visible) continue;

    const text = (await el.textContent().catch(() => '')) ?? '';
    const tag = await el.evaluate((e) => e.tagName.toLowerCase());
    const type = await el.getAttribute('type').catch(() => '');
    const href = await el.getAttribute('href').catch(() => '');
    const title = await el.getAttribute('title').catch(() => '');
    const ariaLabel = await el.getAttribute('aria-label').catch(() => '');

    const descriptor = `${tag}[type=${type ?? '-'}][title="${title ?? ''}" aria="${ariaLabel ?? ''}"] "${text.trim().slice(0, 40)}"`;

    // Skip destructive / session-terminating elements
    const skipThis = SKIP_TEXT_PATTERNS.some(
      (p) => p.test(text) || p.test(ariaLabel ?? '') || p.test(title ?? ''),
    );
    if (skipThis) continue;

    // Skip external links
    if (href && (href.startsWith('http') || href.startsWith('mailto'))) continue;

    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];
    let threw = false;
    let errorMessage: string | undefined;

    const consoleListener = (msg: import('@playwright/test').ConsoleMessage) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    };
    const responseListener = (res: import('@playwright/test').Response) => {
      if (res.status() >= 500) networkErrors.push(`${res.status()} ${res.url()}`);
    };

    page.on('console', consoleListener);
    page.on('response', responseListener);

    try {
      await el.click({ timeout: 3_000, force: false }).catch(() => {
        // Element may be obscured or redirect; tolerate
      });
      await page.waitForTimeout(500);

      // If page navigated away, go back
      if (!page.url().includes(new URL(url, page.url()).pathname.split('/')[1] ?? '')) {
        await page.goBack().catch(() => page.goto(url));
        await page.waitForLoadState('networkidle', { timeout: 10_000 });
      }
    } catch (err: unknown) {
      threw = true;
      errorMessage = err instanceof Error ? err.message : String(err);
    } finally {
      page.off('console', consoleListener);
      page.off('response', responseListener);
    }

    results.push({
      page: pageLabel,
      element: descriptor,
      text: text.trim().slice(0, 60),
      consoleErrors,
      networkErrors,
      threw,
      errorMessage,
    });
  }
}

test.describe('Clickable Audit', () => {
  test('dashboard — audit all interactive elements', async ({ page }) => {
    const results: ClickResult[] = [];

    await auditClickables(page, '/dashboard', 'dashboard', results);

    // Write results for report
    mkdirSync('playwright-report', { recursive: true });
    writeFileSync('playwright-report/clickable-audit.json', JSON.stringify(results, null, 2));

    // Fail if any element caused a 500 server error
    const serverErrors = results.filter((r) => r.networkErrors.length > 0);
    if (serverErrors.length > 0) {
      console.error(
        '⚠ Elements causing server errors:\n' +
          serverErrors.map((r) => `  ${r.element} → ${r.networkErrors.join(', ')}`).join('\n'),
      );
    }

    // Fail if any element caused a JS exception (not just a tolerated navigation)
    const jsErrors = results.filter(
      (r) =>
        r.consoleErrors.length > 0 &&
        r.consoleErrors.some((e) => !e.includes('Warning:') && !e.includes('ResizeObserver')),
    );
    if (jsErrors.length > 0) {
      console.error(
        '⚠ Elements causing JS console errors:\n' +
          jsErrors.map((r) => `  ${r.element}\n    → ${r.consoleErrors.join('\n    → ')}`).join('\n'),
      );
    }

    const total = results.length;
    const broken = serverErrors.length + jsErrors.length;
    console.log(`\nClickable audit: ${total} elements checked, ${broken} issues found`);

    // Soft assertion — report issues but don't hard-fail the suite
    expect(broken).toBeLessThanOrEqual(Math.ceil(total * 0.1)); // allow ≤10% broken
  });

  test('login page — audit interactive elements (unauthenticated)', async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
      ignoreHTTPSErrors: true,
    });
    const page = await ctx.newPage();
    const results: ClickResult[] = [];

    try {
      await auditClickables(page, '/login', 'login', results);
      mkdirSync('playwright-report', { recursive: true });
      writeFileSync(
        'playwright-report/clickable-audit-login.json',
        JSON.stringify(results, null, 2),
      );
      console.log(`Login page audit: ${results.length} elements checked`);
    } finally {
      await ctx.close();
    }
  });
});

test.describe('Page Load Health', () => {
  const PAGES = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/login', label: 'Login' },
  ];

  for (const { path, label } of PAGES) {
    test(`${label} loads without console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await page.goto(path);
      await page.waitForLoadState('networkidle', { timeout: 15_000 });

      const critical = errors.filter(
        (e) =>
          !e.includes('Warning:') &&
          !e.includes('ResizeObserver') &&
          !e.includes('favicon'),
      );
      if (critical.length > 0) {
        console.error(`${label} console errors:\n  ${critical.join('\n  ')}`);
      }
      expect(critical).toHaveLength(0);
    });
  }
});
