import { test, expect } from './fixtures/test-fixtures';
import { createProductionPrismaClient } from '@wedding/db';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';

const prisma = createProductionPrismaClient();

test.describe('Admin Enhancements E2E', () => {
  let adminToken: string;
  let adminEmail: string;
  let adminId: string;
  let tenantId: string;

  test.beforeAll(async () => {
    // Generate a unique email and ID for testing
    adminEmail = `temp-admin-${randomUUID().slice(0, 8)}@test.com`;
    tenantId = randomUUID();
    adminId = randomUUID();

    // Create a temporary tenant and admin user for testing deactivation
    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Temp Tenant',
        slug: `temp-tenant-${randomUUID().slice(0, 8)}`,
      },
    });

    const passwordHash = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        id: adminId,
        tenant_id: tenantId,
        email: adminEmail,
        password_hash: passwordHash,
        role: 'admin',
        name: 'Temp Administrator',
      },
    });

    // Create global admin token for auth headers
    const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';
    adminToken = jwt.sign(
      {
        sub: adminId,
        tenant_id: tenantId,
        role: 'admin',
        email: adminEmail,
        name: 'Temp Administrator',
      },
      jwtSecret
    );
  });

  test.afterAll(async () => {
    // Clean up created users and tenants
    await prisma.user.deleteMany({
      where: { tenant_id: tenantId },
    });
    await prisma.tenant.delete({
      where: { id: tenantId },
    });
  });

  test('should support user deactivation/blocking and admin creation', async ({ request, playwright, baseURL }) => {
    const adminContext = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    // 1. Create a client user to test deactivation
    const clientEmail = `temp-client-${randomUUID().slice(0, 8)}@test.com`;
    const clientPasswordHash = await bcrypt.hash('password123', 10);
    const clientId = randomUUID();
    const clientUser = await prisma.user.create({
      data: {
        id: clientId,
        tenant_id: tenantId,
        email: clientEmail,
        password_hash: clientPasswordHash,
        role: 'client',
        name: 'Temp Client User',
      },
    });

    // Verify client can log in initially
    const loginInitialResponse = await request.post(`${baseURL}/auth/login`, {
      data: {
        email: clientEmail,
        password: 'password123',
      },
    });
    expect(loginInitialResponse.status()).toBe(200);

    // 2. Deactivate the client user via admin status endpoint
    const deactivateResponse = await adminContext.patch(`/admin/users/${clientId}/status`, {
      data: {
        is_active: false,
      },
    });
    expect(deactivateResponse.status()).toBe(200);
    const deactivateBody = await deactivateResponse.json();
    expect(deactivateBody.success).toBe(true);
    expect(deactivateBody.data.is_active).toBe(false);

    // Verify login is blocked with 403 Forbidden
    const loginBlockedResponse = await request.post(`${baseURL}/auth/login`, {
      data: {
        email: clientEmail,
        password: 'password123',
      },
    });
    expect(loginBlockedResponse.status()).toBe(403);
    const loginBlockedBody = await loginBlockedResponse.json();
    expect(loginBlockedBody.success).toBe(false);
    expect(loginBlockedBody.error.code).toBe('AUTHZ_3001'); // ErrorCode.FORBIDDEN

    // 3. Reactivate client user
    const reactivateResponse = await adminContext.patch(`/admin/users/${clientId}/status`, {
      data: {
        is_active: true,
      },
    });
    expect(reactivateResponse.status()).toBe(200);

    // Verify login succeeds again
    const loginActiveResponse = await request.post(`${baseURL}/auth/login`, {
      data: {
        email: clientEmail,
        password: 'password123',
      },
    });
    expect(loginActiveResponse.status()).toBe(200);

    // 4. Create a new platform admin via admin POST /admin/users/admin
    const newAdminEmail = `temp-new-admin-${randomUUID().slice(0, 8)}@test.com`;
    const createAdminResponse = await adminContext.post('/admin/users/admin', {
      data: {
        email: newAdminEmail,
        name: 'New Platform Administrator',
        password: 'password123',
      },
    });
    expect(createAdminResponse.status()).toBe(201);
    const createAdminBody = await createAdminResponse.json();
    expect(createAdminBody.success).toBe(true);
    expect(createAdminBody.data.role).toBe('admin');
    expect(createAdminBody.data.email).toBe(newAdminEmail);

    // Verify the new admin can log in
    const loginNewAdminResponse = await request.post(`${baseURL}/auth/login`, {
      data: {
        email: newAdminEmail,
        password: 'password123',
      },
    });
    expect(loginNewAdminResponse.status()).toBe(200);
    const loginNewAdminBody = await loginNewAdminResponse.json();

    // Verify the new admin can access /admin/stats
    const newAdminContext = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${loginNewAdminBody.tokens.access_token}`,
      },
    });
    const newAdminStatsResponse = await newAdminContext.get('/admin/stats');
    expect(newAdminStatsResponse.status()).toBe(200);

    // Clean up temporary user
    await prisma.user.delete({ where: { id: clientUser.id } });
    await prisma.user.delete({ where: { id: createAdminBody.data.id } });

    await adminContext.dispose();
    await newAdminContext.dispose();
  });
});
