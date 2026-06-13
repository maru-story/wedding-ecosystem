import { test, expect } from './fixtures/test-fixtures';

test.describe('Auth API E2E', () => {
  test('should fail login with incorrect credentials', async ({ request }) => {
    const response = await request.post('/auth/login', {
      data: {
        email: 'nonexistent@test.com',
        password: 'wrongpassword',
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('AUTH_2001');
  });

  test('should return validation error for invalid login payload', async ({ request }) => {
    const response = await request.post('/auth/login', {
      data: {
        email: 'in!',
        password: 'password123',
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VAL_4001');
  });

  test('should login successfully with email', async ({ tenantA, request }) => {
    const response = await request.post('/auth/login', {
      data: {
        email: tenantA.userEmail,
        password: 'password123',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.user.email).toBe(tenantA.userEmail);
    expect(body.tokens.access_token).toBeDefined();
  });

  test('should login successfully with username', async ({ tenantA, request }) => {
    expect(tenantA.username).toBeDefined();

    const response = await request.post('/auth/login', {
      data: {
        email: tenantA.username,
        password: 'password123',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.user.email).toBe(tenantA.userEmail);
    expect(body.tokens.access_token).toBeDefined();
  });
});
