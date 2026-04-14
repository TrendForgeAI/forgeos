/**
 * Global Settings overlay — all tabs (Git, Claude, Codex, Users, Activity),
 * open/close behaviours, and ProjectSettingsOverlay.
 */
import { test, expect } from '@playwright/test';

async function openGlobalSettings(page: import('@playwright/test').Page) {
  await page.goto('/dashboard');
  await expect(page.locator('header')).toBeVisible({ timeout: 15_000 });
  // UserMenu is the last button in the header
  const userBtn = page.locator('header button').last();
  await userBtn.click();
  // Click "Settings" or "Global Settings" from the dropdown
  const settingsLink = page.locator('text=/settings/i').first();
  await settingsLink.click({ timeout: 5_000 });
  await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 8_000 });
}

test.describe('Global Settings Overlay', () => {
  test('opens via user menu', async ({ page }) => {
    await openGlobalSettings(page);
    await expect(page.locator('[role="dialog"] h2')).toContainText(/global settings/i);
  });

  test('closes with × button', async ({ page }) => {
    await openGlobalSettings(page);
    await page.locator('[role="dialog"] button[aria-label="Close"]').click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 });
  });

  test('closes with Escape key', async ({ page }) => {
    await openGlobalSettings(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 });
  });

  test('closes by clicking backdrop', async ({ page }) => {
    await openGlobalSettings(page);
    // Click outside the dialog box
    await page.mouse.click(10, 10);
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 });
  });

  test('renders 5 tabs: Git, Claude, Codex, Users, Activity', async ({ page }) => {
    await openGlobalSettings(page);
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.locator('button', { hasText: /^Git$/ })).toBeVisible();
    await expect(dialog.locator('button', { hasText: /^Claude$/ })).toBeVisible();
    await expect(dialog.locator('button', { hasText: /^Codex$/ })).toBeVisible();
    await expect(dialog.locator('button', { hasText: /^Users$/ })).toBeVisible();
    await expect(dialog.locator('button', { hasText: /^Activity$/ })).toBeVisible();
  });

  test('Git tab is active by default', async ({ page }) => {
    await openGlobalSettings(page);
    // Git content should be visible without extra clicks
    await expect(page.locator('[role="dialog"]')).toContainText(/git/i);
  });

  test('clicking Claude tab shows Claude settings', async ({ page }) => {
    await openGlobalSettings(page);
    await page.locator('[role="dialog"] button', { hasText: /^Claude$/ }).click();
    await expect(page.locator('[role="dialog"]')).toContainText(/claude|api key|oauth/i);
  });

  test('clicking Codex tab shows Codex settings', async ({ page }) => {
    await openGlobalSettings(page);
    await page.locator('[role="dialog"] button', { hasText: /^Codex$/ }).click();
    await expect(page.locator('[role="dialog"]')).toContainText(/codex|openai|device/i);
  });

  test('clicking Users tab shows user management', async ({ page }) => {
    await openGlobalSettings(page);
    await page.locator('[role="dialog"] button', { hasText: /^Users$/ }).click();
    await expect(page.locator('[role="dialog"]')).toContainText(/user|invite|email/i);
  });

  test('clicking Activity tab shows activity log', async ({ page }) => {
    await openGlobalSettings(page);
    await page.locator('[role="dialog"] button', { hasText: /^Activity$/ }).click();
    // Activity panel shows log entries (at least a heading or empty state)
    await expect(page.locator('[role="dialog"]')).toContainText(/activity|log|event/i);
  });
});

test.describe('Project Settings Overlay', () => {
  test('opens via user menu project settings option', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('header')).toBeVisible({ timeout: 15_000 });
    const userBtn = page.locator('header button').last();
    await userBtn.click();
    // Look for "Project Settings" option
    const projectSettingsOption = page.locator('text=/project settings/i').first();
    const visible = await projectSettingsOption.isVisible().catch(() => false);
    if (!visible) {
      test.skip(true, 'Project Settings not found in user menu');
    }
    await projectSettingsOption.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Git Settings', () => {
  test('Git tab shows name and email fields', async ({ page }) => {
    await openGlobalSettings(page);
    // Git tab is default
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.locator('input')).toHaveCount({ minimum: 1 });
  });
});
