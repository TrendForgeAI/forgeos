/**
 * API-level smoke tests — no browser, raw HTTP via Playwright's request fixture.
 * Runs after global.setup.ts has established an auth session.
 */
import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'trendforge.ai@gmail.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

// ─── Health ───────────────────────────────────────────────────────────────────

test.describe('Health', () => {
  test('GET /api/health → 200', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('status', 'ok');
  });
});

// ─── Setup Status ─────────────────────────────────────────────────────────────

test.describe('Setup Status', () => {
  test('GET /api/setup/status → setupComplete: true', async ({ request }) => {
    const res = await request.get('/api/setup/status');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.setupComplete).toBe(true);
  });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

test.describe('Auth', () => {
  test('POST /api/auth/login with valid credentials → 200 + user', async ({ request }) => {
    if (!ADMIN_PASSWORD) test.skip(true, 'TEST_ADMIN_PASSWORD not set');
    const res = await request.post('/api/auth/login', {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user.email).toBe(ADMIN_EMAIL);
    expect(body.user.role).toBe('admin');
  });

  test('POST /api/auth/login with wrong password → 401', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: ADMIN_EMAIL, password: 'WrongPassword123!' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('POST /api/auth/login with unknown email → 401', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'nobody@example.com', password: 'anything' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/auth/login with missing fields → 400', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: ADMIN_EMAIL },
    });
    expect(res.status()).toBe(400);
  });

  test('GET /api/auth/me → returns current user (with auth cookie)', async ({ request }) => {
    const res = await request.get('/api/auth/me');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe(ADMIN_EMAIL);
    expect(body.user.role).toBe('admin');
    expect(body.user).toHaveProperty('id');
    expect(body.user).toHaveProperty('name');
  });

  test('GET /api/auth/me without cookie → 401', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ ignoreHTTPSErrors: true });
    const res = await ctx.get(
      (process.env.FORGEOS_URL ?? 'https://forgeos.trend-forge.dev') + '/api/auth/me',
    );
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('POST /api/auth/logout → 200', async ({ request }) => {
    const res = await request.post('/api/auth/logout');
    expect([200, 204]).toContain(res.status());
  });
});

// ─── Projects ─────────────────────────────────────────────────────────────────

test.describe('Projects API', () => {
  let createdProjectId: string | null = null;
  const testProjectName = `test-proj-${Date.now()}`;

  test('GET /api/projects → array', async ({ request }) => {
    const res = await request.get('/api/projects');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.projects)).toBe(true);
  });

  test('GET /api/projects without auth → 401', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ ignoreHTTPSErrors: true });
    const res = await ctx.get(
      (process.env.FORGEOS_URL ?? 'https://forgeos.trend-forge.dev') + '/api/projects',
    );
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('POST /api/projects (empty repo) → 201', async ({ request }) => {
    const res = await request.post('/api/projects', {
      data: { name: testProjectName },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.project.name).toBe(testProjectName);
    createdProjectId = body.project.id;
  });

  test('POST /api/projects with duplicate name → 409', async ({ request }) => {
    const res = await request.post('/api/projects', {
      data: { name: testProjectName },
    });
    expect(res.status()).toBe(409);
  });

  test('POST /api/projects with invalid name → 400', async ({ request }) => {
    const res = await request.post('/api/projects', {
      data: { name: 'invalid name with spaces!' },
    });
    expect(res.status()).toBe(400);
  });

  test('DELETE /api/projects/:id → 200', async ({ request }) => {
    if (!createdProjectId) test.skip(true, 'Project not created in prior test');
    const res = await request.delete(`/api/projects/${createdProjectId}`);
    expect(res.status()).toBe(200);
  });
});

// ─── Files ────────────────────────────────────────────────────────────────────

test.describe('Files API', () => {
  test('GET /api/files?path=/app → items array', async ({ request }) => {
    const res = await request.get('/api/files?path=/app');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    // ForgeOS root should contain package.json
    const names = body.items.map((i: { name: string }) => i.name);
    expect(names).toContain('package.json');
  });

  test('GET /api/files/tree?path=/app → tree structure', async ({ request }) => {
    const res = await request.get('/api/files/tree?path=/app');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('items');
  });

  test('GET /api/files/content?path=/app/package.json → file content', async ({ request }) => {
    const res = await request.get('/api/files/content?path=/app/package.json');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.content).toContain('forgeos');
  });

  test('GET /api/files without auth → 401', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ ignoreHTTPSErrors: true });
    const res = await ctx.get(
      (process.env.FORGEOS_URL ?? 'https://forgeos.trend-forge.dev') + '/api/files?path=/app',
    );
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });
});

// ─── Admin ────────────────────────────────────────────────────────────────────

test.describe('Admin API', () => {
  test('GET /api/admin/users → users array (admin only)', async ({ request }) => {
    const res = await request.get('/api/admin/users');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.users)).toBe(true);
    expect(body.users.length).toBeGreaterThan(0);
    const admin = body.users.find((u: { email: string }) => u.email === ADMIN_EMAIL);
    expect(admin).toBeTruthy();
    expect(admin.role).toBe('admin');
  });

  test('GET /api/admin/users without auth → 403', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ ignoreHTTPSErrors: true });
    const res = await ctx.get(
      (process.env.FORGEOS_URL ?? 'https://forgeos.trend-forge.dev') + '/api/admin/users',
    );
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });

  test('GET /api/admin/invites → invites array', async ({ request }) => {
    const res = await request.get('/api/admin/invites');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.invites)).toBe(true);
  });
});

// ─── Activity ─────────────────────────────────────────────────────────────────

test.describe('Activity API', () => {
  test('GET /api/activity → activity log entries', async ({ request }) => {
    const res = await request.get('/api/activity');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.entries ?? body.logs ?? body.activities ?? [])).toBe(true);
  });
});

// ─── Provider Routing ─────────────────────────────────────────────────────────

test.describe('Provider Routing API', () => {
  test('GET /api/provider-routing → routing config', async ({ request }) => {
    const res = await request.get('/api/provider-routing');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('activeOrchestrator');
  });
});

// ─── Git ──────────────────────────────────────────────────────────────────────

test.describe('Git API', () => {
  test('GET /api/git/status?path=/app → changes array', async ({ request }) => {
    const res = await request.get('/api/git/status?path=/app');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.changes)).toBe(true);
  });

  test('GET /api/git/branch?path=/app → branch name', async ({ request }) => {
    const res = await request.get('/api/git/branch?path=/app');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.branch).toBe('string');
  });
});
