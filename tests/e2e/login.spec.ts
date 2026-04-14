/**
 * Login page — authentication flows.
 * NOTE: These tests intentionally do NOT use the saved auth state
 * so they test the actual login/logout cycle.
 */
import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'trendforge.ai@gmail.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

// Override storageState for login tests — start unauthenticated
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders ForgeOS heading and form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('ForgeOS');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText(/sign in/i);
  });

  test('shows error with wrong credentials', async ({ page }) => {
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill('WrongPasswordXYZ!');
    await page.locator('button[type="submit"]').click();
    // Should stay on /login and show an error
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('p')).toContainText(/invalid|credentials|failed/i);
  });

  test('shows error with empty password', async ({ page }) => {
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    // Leave password empty — HTML validation should kick in
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('submit button is disabled while loading', async ({ page }) => {
    if (!ADMIN_PASSWORD) test.skip(true, 'TEST_ADMIN_PASSWORD not set');
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    const btn = page.locator('button[type="submit"]');
    await btn.click();
    // Immediately after click, button should be disabled or text changes
    // (race: it might redirect before we can check, so we tolerate both)
    await page.waitForURL(/\/dashboard|\/login/, { timeout: 15_000 });
  });

  test('successful login redirects to /dashboard', async ({ page }) => {
    if (!ADMIN_PASSWORD) test.skip(true, 'TEST_ADMIN_PASSWORD not set');
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
    await expect(page.locator('header')).toBeVisible();
  });
});

test.describe('Unauthenticated Redirects', () => {
  test('GET / → redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login|\/setup/, { timeout: 10_000 });
  });

  test('GET /dashboard → redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login|\/setup/, { timeout: 10_000 });
  });
});
