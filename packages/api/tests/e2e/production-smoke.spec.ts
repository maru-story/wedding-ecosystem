import { test, expect } from '@playwright/test';

const PROD_URL = process.env.PRODUCTION_URL || 'https://api.maruplanner.my.id';

test.describe('Production Live API Smoke Test', () => {
  test.use({ baseURL: PROD_URL });

  test('GET / should return 200 and online status', async ({ request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.name).toBe('wedding-ecosystem-api');
    expect(body.status).toBe('online');
    expect(body.version).toBeDefined();
  });

  test('POST /auth/login should validate input schema (returns 400 on invalid payload)', async ({ request }) => {
    const response = await request.post('/auth/login', {
      data: {
        email: 'invalid-email-format',
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VAL_4001');
  });

  test('GET /health dependency check', async ({ request }) => {
    const response = await request.get('/health');
    const body = await response.json();

    // Verify health response structure
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('dependencies');
    expect(body.dependencies).toHaveProperty('postgresql');
  });
});
