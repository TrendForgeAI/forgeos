/**
 * Project management — create (empty + clone), select, delete.
 */
import { test, expect } from '@playwright/test';

const TEST_PROJECT = `e2e-test-${Date.now()}`;

test.describe('Projects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('aside')).toBeVisible({ timeout: 15_000 });
  });

  test('sidebar shows "Projects" section heading', async ({ page }) => {
    await expect(page.locator('aside')).toContainText('Projects');
  });

  test('ForgeOS root entry is always present', async ({ page }) => {
    await expect(page.locator('aside button', { hasText: 'ForgeOS' })).toBeVisible();
  });

  test('"+" button in sidebar is visible (admin)', async ({ page }) => {
    const addBtn = page.locator('aside button[title="New project"]');
    await expect(addBtn).toBeVisible();
  });

  // ─── New Project Modal ────────────────────────────────────────────────────

  test('clicking "+" opens New Project modal', async ({ page }) => {
    await page.locator('aside button[title="New project"]').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('[role="dialog"] h2')).toContainText('New Project');
  });

  test('modal has "Empty repo" and "Clone from URL" tabs', async ({ page }) => {
    await page.locator('aside button[title="New project"]').click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.locator('button', { hasText: /empty repo/i })).toBeVisible();
    await expect(dialog.locator('button', { hasText: /clone from url/i })).toBeVisible();
  });

  test('modal closes with Escape key', async ({ page }) => {
    await page.locator('aside button[title="New project"]').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3_000 });
  });

  test('modal closes with Cancel button', async ({ page }) => {
    await page.locator('aside button[title="New project"]').click();
    await page.locator('[role="dialog"] button', { hasText: /cancel/i }).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3_000 });
  });

  test('modal closes by clicking backdrop', async ({ page }) => {
    await page.locator('aside button[title="New project"]').click();
    // Click the semi-transparent backdrop (fixed overlay behind dialog)
    await page.mouse.click(10, 10);
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3_000 });
  });

  test('switching to Clone tab shows Git URL input', async ({ page }) => {
    await page.locator('aside button[title="New project"]').click();
    await page.locator('[role="dialog"] button', { hasText: /clone from url/i }).click();
    await expect(page.locator('[role="dialog"] input[placeholder*="github"]')).toBeVisible();
  });

  test('submitting empty name shows validation error', async ({ page }) => {
    await page.locator('aside button[title="New project"]').click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog.locator('p')).toContainText(/required|invalid/i);
  });

  test('submitting invalid name (spaces) shows error', async ({ page }) => {
    await page.locator('aside button[title="New project"]').click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('input[placeholder="my-project"]').fill('invalid name!');
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog.locator('p')).toContainText(/invalid|error/i);
  });

  // ─── Create + Delete ──────────────────────────────────────────────────────

  test('create empty project, verify in sidebar, then delete', async ({ page }) => {
    // Create
    await page.locator('aside button[title="New project"]').click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('input[placeholder="my-project"]').fill(TEST_PROJECT);
    await dialog.locator('button[type="submit"]').click();

    // Wait for dialog to close and project to appear
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 20_000 });
    await expect(page.locator('aside', { hasText: TEST_PROJECT })).toBeVisible({ timeout: 10_000 });

    // Select the project
    await page.locator('aside button', { hasText: TEST_PROJECT }).click();

    // Delete — find the × button next to this project
    const projectRow = page.locator('aside div', { hasText: TEST_PROJECT }).first();
    const deleteBtn = projectRow.locator('button[title*="Delete"]');
    await deleteBtn.click();

    // Confirm browser dialog
    page.on('dialog', (d) => d.accept());

    // Project should disappear
    await expect(page.locator('aside', { hasText: TEST_PROJECT })).not.toBeVisible({ timeout: 10_000 });
  });
});
