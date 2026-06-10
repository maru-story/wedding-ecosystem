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

  test('should support user deactivation/blocking and admin creation', async ({
    request,
    playwright,
    baseURL,
  }) => {
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
    await prisma.user.delete({ where: { id: clientUser.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: createAdminBody.data.id } }).catch(() => {});

    await adminContext.dispose();
    await newAdminContext.dispose();
  });

  test('should support tenant and user deletion with safety protections', async ({
    playwright,
    baseURL,
  }) => {
    const adminContext = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    // 1. Test user deletion
    // Create temporary tenant and client user
    const tempTenantId = randomUUID();
    const tempUserId = randomUUID();
    await prisma.tenant.create({
      data: {
        id: tempTenantId,
        name: 'Delete Test Tenant',
        slug: `del-tenant-${randomUUID().slice(0, 8)}`,
      },
    });

    await prisma.user.create({
      data: {
        id: tempUserId,
        tenant_id: tempTenantId,
        email: `del-user-${randomUUID().slice(0, 8)}@test.com`,
        password_hash: 'hash',
        role: 'client',
        name: 'Del User',
      },
    });

    // Verify user exists in DB
    let userRecord = await prisma.user.findUnique({ where: { id: tempUserId } });
    expect(userRecord).not.toBeNull();

    // Call user deletion endpoint
    const deleteUserResponse = await adminContext.delete(`/admin/users/${tempUserId}`);
    expect(deleteUserResponse.status()).toBe(200);
    const deleteUserBody = await deleteUserResponse.json();
    expect(deleteUserBody.success).toBe(true);

    // Verify user is gone from DB
    userRecord = await prisma.user.findUnique({ where: { id: tempUserId } });
    expect(userRecord).toBeNull();

    // 2. Prevent self-deletion
    const deleteSelfResponse = await adminContext.delete(`/admin/users/${adminId}`);
    expect(deleteSelfResponse.status()).toBe(400);
    const deleteSelfBody = await deleteSelfResponse.json();
    expect(deleteSelfBody.success).toBe(false);
    expect(deleteSelfBody.error.message).toContain('tidak dapat menghapus akun Anda sendiri');

    // 3. Prevent deleting other admin users
    const otherAdminId = randomUUID();
    await prisma.user.create({
      data: {
        id: otherAdminId,
        tenant_id: tempTenantId,
        email: `other-admin-${randomUUID().slice(0, 8)}@test.com`,
        password_hash: 'hash',
        role: 'admin',
        name: 'Other Admin',
      },
    });

    const deleteOtherAdminResponse = await adminContext.delete(`/admin/users/${otherAdminId}`);
    expect(deleteOtherAdminResponse.status()).toBe(400);
    const deleteOtherAdminBody = await deleteOtherAdminResponse.json();
    expect(deleteOtherAdminBody.success).toBe(false);
    expect(deleteOtherAdminBody.error.message).toContain('Pengguna dengan peran Administrator tidak dapat dihapus');

    // Clean up other admin manually via prisma
    await prisma.user.delete({ where: { id: otherAdminId } });

    // 4. Test tenant deletion (which should cascade delete all users and events)
    const clientUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: clientUserId,
        tenant_id: tempTenantId,
        email: `del-client-${randomUUID().slice(0, 8)}@test.com`,
        password_hash: 'hash',
        role: 'client',
        name: 'Del Client',
      },
    });

    // Verify tenant and user exist
    let tenantRecord = await prisma.tenant.findUnique({ where: { id: tempTenantId } });
    expect(tenantRecord).not.toBeNull();
    userRecord = await prisma.user.findUnique({ where: { id: clientUserId } });
    expect(userRecord).not.toBeNull();

    // 5. Prevent deleting the tenant they currently belong to
    const deleteOwnTenantResponse = await adminContext.delete(`/admin/tenants/${tenantId}`);
    expect(deleteOwnTenantResponse.status()).toBe(400);
    const deleteOwnTenantBody = await deleteOwnTenantResponse.json();
    expect(deleteOwnTenantBody.success).toBe(false);
    expect(deleteOwnTenantBody.error.message).toContain('tidak dapat menghapus tenant tempat akun Anda terdaftar');

    // 6. Prevent deleting any tenant that contains admin users
    // Create an admin user under the tempTenantId
    const tempAdminId = randomUUID();
    await prisma.user.create({
      data: {
        id: tempAdminId,
        tenant_id: tempTenantId,
        email: `temp-admin-${randomUUID().slice(0, 8)}@test.com`,
        password_hash: 'hash',
        role: 'admin',
        name: 'Temp Admin 2',
      },
    });

    const deleteTenantWithAdminResponse = await adminContext.delete(`/admin/tenants/${tempTenantId}`);
    expect(deleteTenantWithAdminResponse.status()).toBe(400);
    const deleteTenantWithAdminBody = await deleteTenantWithAdminResponse.json();
    expect(deleteTenantWithAdminBody.success).toBe(false);
    expect(deleteTenantWithAdminBody.error.message).toContain('tidak dapat dihapus karena memiliki pengguna dengan peran Administrator');

    // Clean up the temp admin user so we can delete the tenant
    await prisma.user.delete({ where: { id: tempAdminId } });

    // 7. Delete tenant via endpoint (should succeed now that tempAdminId is deleted)
    const deleteTenantResponse = await adminContext.delete(`/admin/tenants/${tempTenantId}`);
    expect(deleteTenantResponse.status()).toBe(200);
    const deleteTenantBody = await deleteTenantResponse.json();
    expect(deleteTenantBody.success).toBe(true);

    // Verify tenant and user are cascade deleted from DB
    tenantRecord = await prisma.tenant.findUnique({ where: { id: tempTenantId } });
    expect(tenantRecord).toBeNull();
    userRecord = await prisma.user.findUnique({ where: { id: clientUserId } });
    expect(userRecord).toBeNull();

    await adminContext.dispose();
  });
});
