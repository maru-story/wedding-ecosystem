import { test, expect } from '@playwright/test';

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
        email: 'invalid-email',
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VAL_4001');
  });
});
