/**
 * Global setup: authenticates as admin once, saves storage state.
 * All subsequent tests reuse this cookie — avoids repeated logins.
 */
import { test as setup, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'trendforge.ai@gmail.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

setup('authenticate as admin', async ({ page }) => {
  if (!ADMIN_PASSWORD) {
    throw new Error(
      'TEST_ADMIN_PASSWORD env var is required. Copy .env.test.example → .env.test and fill in the password.',
    );
  }

  // Navigate to login (root redirects to /login when auth is required)
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login/);

  // Fill credentials
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();

  // Expect redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
  await expect(page.locator('header')).toBeVisible();

  // Persist auth state
  mkdirSync('tests/.auth', { recursive: true });
  await page.context().storageState({ path: 'tests/.auth/user.json' });
  console.log('✓ Auth state saved to tests/.auth/user.json');
});
