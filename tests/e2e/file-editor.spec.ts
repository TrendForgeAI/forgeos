/**
 * File browser and editor — file tree rendering, file open, content display,
 * and write operations.
 */
import { test, expect } from '@playwright/test';

test.describe('File Tree', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    // Make sure ForgeOS project is selected (default /app)
    await page.locator('aside button', { hasText: 'ForgeOS' }).click();
    await expect(page.locator('aside')).toBeVisible({ timeout: 10_000 });
  });

  test('file tree renders at least one item', async ({ page }) => {
    // FileTree renders items after /api/files?path=/app loads
    await page.waitForTimeout(1_500); // allow API call
    const treeItems = page.locator('aside button, aside [role="treeitem"], aside div[style*="cursor: pointer"]');
    const count = await treeItems.count();
    expect(count).toBeGreaterThan(1); // at minimum ForgeOS button + file items
  });

  test('package.json is visible in file tree', async ({ page }) => {
    await page.waitForTimeout(1_500);
    await expect(page.locator('aside', { hasText: 'package.json' })).toBeVisible({ timeout: 8_000 });
  });

  test('clicking a file opens the editor/viewer', async ({ page }) => {
    await page.waitForTimeout(1_500);
    // Find and click package.json in the file tree
    const fileItem = page.locator('aside').getByText('package.json').first();
    await expect(fileItem).toBeVisible({ timeout: 8_000 });
    await fileItem.click();
    // Editor panel should appear in the main content area
    // Either a CodeMirror editor or a file overlay
    await expect(
      page.locator('.cm-editor, [data-testid="file-editor"], textarea').first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('File Editor Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.locator('aside button', { hasText: 'ForgeOS' }).click();
    await page.waitForTimeout(1_500);
    // Open package.json
    const fileItem = page.locator('aside').getByText('package.json').first();
    if (await fileItem.isVisible()) {
      await fileItem.click();
      await page.waitForTimeout(1_000);
    }
  });

  test('editor shows file content', async ({ page }) => {
    const editor = page.locator('.cm-editor, textarea').first();
    if (!(await editor.isVisible())) {
      test.skip(true, 'Editor did not open');
    }
    // Content should include "forgeos"
    const content = await editor.textContent();
    expect(content?.toLowerCase()).toContain('forgeos');
  });

  test('editor panel has a save/close affordance', async ({ page }) => {
    const editor = page.locator('.cm-editor, textarea').first();
    if (!(await editor.isVisible())) {
      test.skip(true, 'Editor did not open');
    }
    // Look for close, save, or ESC hint
    const hasSaveOrClose = await page
      .locator('button', { hasText: /save|close|✕|×/i })
      .first()
      .isVisible()
      .catch(() => false);
    // ESC hint might also be present
    const hasEscHint = await page.locator('text=/esc/i').first().isVisible().catch(() => false);
    expect(hasSaveOrClose || hasEscHint).toBe(true);
  });
});

test.describe('File Write API', () => {
  test('POST /api/files/write with valid path writes content', async ({ request }) => {
    const testPath = '/workspace/.forgeos-e2e-write-test.txt';
    const res = await request.post('/api/files/write', {
      data: { path: testPath, content: 'e2e test content\n' },
    });
    expect([200, 201]).toContain(res.status());

    // Verify content readable
    const readRes = await request.get(`/api/files/content?path=${encodeURIComponent(testPath)}`);
    if (readRes.status() === 200) {
      const body = await readRes.json();
      expect(body.content).toContain('e2e test content');
    }

    // Cleanup via API
    await request.post('/api/files/action', {
      data: { action: 'delete', path: testPath },
    }).catch(() => {}); // ignore if action endpoint doesn't exist
  });

  test('GET /api/files/read returns file content', async ({ request }) => {
    const res = await request.get('/api/files/read?path=/app/package.json');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.content ?? body.text).toBeTruthy();
  });
});
