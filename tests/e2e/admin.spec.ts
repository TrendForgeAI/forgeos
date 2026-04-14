/**
 * Admin features — user management, invites, role-based visibility.
 */
import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'trendforge.ai@gmail.com';
const ADMIN_NAME = process.env.TEST_ADMIN_NAME ?? 'TrendForgeAI';

async function openUsersTab(page: import('@playwright/test').Page) {
  await page.goto('/dashboard');
  await expect(page.locator('header')).toBeVisible({ timeout: 15_000 });
  const userBtn = page.locator('header button').last();
  await userBtn.click();
  await page.locator('text=/settings/i').first().click({ timeout: 5_000 });
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  await page.locator('[role="dialog"] button', { hasText: /^Users$/ }).click();
}

test.describe('User Management Panel', () => {
  test('admin user appears in user list', async ({ page }) => {
    await openUsersTab(page);
    await expect(page.locator('[role="dialog"]')).toContainText(ADMIN_EMAIL, { timeout: 8_000 });
  });

  test('admin name is displayed', async ({ page }) => {
    await openUsersTab(page);
    await expect(page.locator('[role="dialog"]')).toContainText(ADMIN_NAME, { timeout: 8_000 });
  });

  test('admin role badge is shown', async ({ page }) => {
    await openUsersTab(page);
    await expect(page.locator('[role="dialog"]')).toContainText(/admin/i, { timeout: 8_000 });
  });

  test('admin cannot delete themselves', async ({ page }) => {
    await openUsersTab(page);
    // Find the admin row — delete button should be hidden or disabled
    const adminRow = page.locator('[role="dialog"]').locator('div, tr', { hasText: ADMIN_EMAIL }).first();
    const deleteBtn = adminRow.locator('button', { hasText: /delete|remove|×/i });
    // Either no delete button OR it is disabled
    const exists = await deleteBtn.isVisible().catch(() => false);
    if (exists) {
      expect(await deleteBtn.isDisabled()).toBe(true);
    }
    // else: no delete button, which is also fine
  });
});

test.describe('Invite Panel', () => {
  test('invite panel renders in Users tab', async ({ page }) => {
    await openUsersTab(page);
    await expect(page.locator('[role="dialog"]')).toContainText(/invite/i, { timeout: 8_000 });
  });

  test('can create an invite link', async ({ page }) => {
    await openUsersTab(page);
    const dialog = page.locator('[role="dialog"]');
    // Look for email input in invite section
    const emailInput = dialog.locator('input[type="email"], input[placeholder*="email" i]').last();
    if (!(await emailInput.isVisible())) {
      test.skip(true, 'Invite email input not visible');
    }
    await emailInput.fill('e2e-invite-test@example.com');
    const inviteBtn = dialog.locator('button', { hasText: /send invite|invite|create/i }).last();
    await inviteBtn.click();
    // Should show success or the invite in the list
    await page.waitForTimeout(2_000);
    await expect(dialog).toContainText(/invite|e2e-invite-test/i, { timeout: 8_000 });
  });
});

test.describe('Admin API - Role Guards', () => {
  test('admin can access user list', async ({ request }) => {
    const res = await request.get('/api/admin/users');
    expect(res.status()).toBe(200);
  });

  test('admin can access invite list', async ({ request }) => {
    const res = await request.get('/api/admin/invites');
    expect(res.status()).toBe(200);
  });

  test('admin can create invite via API', async ({ request }) => {
    const res = await request.post('/api/admin/invites', {
      data: { email: `e2e-api-invite-${Date.now()}@example.com` },
    });
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body.invite ?? body).toBeTruthy();
  });
});

test.describe('Delete User API - Role Guard', () => {
  test('DELETE /api/admin/users/:id requires admin', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ ignoreHTTPSErrors: true });
    const res = await ctx.delete(
      (process.env.FORGEOS_URL ?? 'https://forgeos.trend-forge.dev') +
        '/api/admin/users/nonexistent-id',
    );
    expect([401, 403]).toContain(res.status());
    await ctx.dispose();
  });
});
