import { test, expect } from './fixtures/test-fixtures';
import { createProductionPrismaClient } from '@wedding/db';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const prisma = createProductionPrismaClient();

test.describe('Quota and Guest Limit E2E', () => {
  test('should restrict guest capacity limits and allow admin to update them', async ({
    tenantA,
    playwright,
    baseURL,
  }) => {
    // 1. Initially, tenantA has max_guests: 2000 by default (seeded in test-fixtures.ts)
    // Let's update tenantA's max_guests configuration to 1 to test enforcement
    await prisma.eventConfig.update({
      where: { event_id: tenantA.eventId },
      data: { max_guests: 1 },
    });

    // 2. Add first guest - should succeed (count becomes 1, which equals limit)
    const addGuest1Response = await tenantA.request.post('/guests', {
      data: {
        name: 'Guest One',
        group: 'friend',
        type: 'invited',
        phone: '628123456789',
        plus_one_count: 0,
      },
    });
    expect(addGuest1Response.status()).toBe(201);

    // 3. Add second guest - should fail with GUEST_LIMIT_EXCEEDED (403)
    const addGuest2Response = await tenantA.request.post('/guests', {
      data: {
        name: 'Guest Two',
        group: 'friend',
        type: 'invited',
        phone: '628123456780',
        plus_one_count: 0,
      },
    });
    expect(addGuest2Response.status()).toBe(403);
    const addGuest2Body = await addGuest2Response.json();
    expect(addGuest2Body.success).toBe(false);
    expect(addGuest2Body.error.code).toBe('GUEST_6005'); // ErrorCode.GUEST_LIMIT_EXCEEDED

    // 4. Authenticate as global admin
    const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';
    const adminToken = jwt.sign(
      {
        sub: randomUUID(),
        tenant_id: randomUUID(),
        role: 'admin',
        email: 'admin-global@test.com',
        name: 'Admin Global Test',
      },
      jwtSecret
    );

    const adminContext = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    // 5. Global Admin gets tenant's events
    const getEventsResponse = await adminContext.get(`/admin/tenants/${tenantA.tenantId}/events`);
    expect(getEventsResponse.status()).toBe(200);
    const getEventsBody = await getEventsResponse.json();
    expect(getEventsBody.success).toBe(true);
    expect(getEventsBody.data.length).toBe(1);
    expect(getEventsBody.data[0].id).toBe(tenantA.eventId);
    expect(getEventsBody.data[0].event_config.max_guests).toBe(1);

    // 6. Global Admin patches max_guests configuration to 5
    const patchConfigResponse = await adminContext.patch(
      `/admin/events/${tenantA.eventId}/config`,
      {
        data: {
          max_guests: 5,
        },
      }
    );
    expect(patchConfigResponse.status()).toBe(200);
    const patchConfigBody = await patchConfigResponse.json();
    expect(patchConfigBody.success).toBe(true);
    expect(patchConfigBody.data.max_guests).toBe(5);

    // 7. Client (tenantA) adds the second guest again - should now succeed!
    const addGuest2RetryResponse = await tenantA.request.post('/guests', {
      data: {
        name: 'Guest Two',
        group: 'friend',
        type: 'invited',
        phone: '628123456780',
        plus_one_count: 0,
      },
    });
    expect(addGuest2RetryResponse.status()).toBe(201);

    // Clean up created guests so tenant deletion cascading works cleanly if needed
    await prisma.guest.deleteMany({
      where: { event_id: tenantA.eventId },
    });

    // Dispose admin context
    await adminContext.dispose();
  });
});
