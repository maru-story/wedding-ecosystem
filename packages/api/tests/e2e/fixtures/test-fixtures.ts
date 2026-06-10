import { test as base, expect } from '@playwright/test';
import { createProductionPrismaClient } from '@wedding/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = createProductionPrismaClient();

export interface TenantContext {
  tenantId: string;
  eventId: string;
  userId: string;
  userEmail: string;
  token: string;
  username?: string;
  request: import('@playwright/test').APIRequestContext;
}

type MyFixtures = {
  tenantA: TenantContext;
  tenantB: TenantContext;
};

export const test = base.extend<MyFixtures>({
  tenantA: async ({ playwright, baseURL }, use) => {
    const tenantId = randomUUID();
    const eventId = randomUUID();
    const userId = randomUUID();

    // Seed Tenant A
    const slug = `tenant-a-${randomUUID().slice(0, 8)}`;
    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Tenant A',
        slug,
        plan_type: 'basic',
        is_active: true,
      },
    });

    const userEmail = `user-a-${randomUUID().slice(0, 8)}@test.com`;
    const userName = 'User A';
    const username = `usera_${randomUUID().slice(0, 8)}`;
    await prisma.user.create({
      data: {
        id: userId,
        tenant_id: tenantId,
        email: userEmail,
        username,
        password_hash: bcrypt.hashSync('password123', 10),
        role: 'client',
        name: userName,
      },
    });

    const eventSlug = `event-a-${randomUUID().slice(0, 8)}`;
    await prisma.event.create({
      data: {
        id: eventId,
        tenant_id: tenantId,
        slug: eventSlug,
        bride_name: 'Bride A',
        groom_name: 'Groom A',
        event_date: new Date(),
        venue_name: 'Venue A',
        venue_address: 'Address A',
        venue_maps_url: 'http://maps.google.com',
        akad_start: '09:00',
        akad_end: '11:00',
        resepsi_start: '12:00',
        resepsi_end: '15:00',
        status: 'published',
      },
    });

    // Create EventConfig for the event to support scanning devices/capacity constraints
    await prisma.eventConfig.create({
      data: {
        event_id: eventId,
        theme_config: {},
        active_sections: [],
        max_scanner_devices: 2,
        max_guests: 2000,
      },
    });

    const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';
    const token = jwt.sign(
      {
        sub: userId,
        tenant_id: tenantId,
        role: 'client',
        email: userEmail,
        name: userName,
      },
      jwtSecret
    );

    const context = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    await use({
      tenantId,
      eventId,
      userId,
      userEmail,
      token,
      username,
      request: context,
    });

    // Teardown Tenant A
    await context.dispose();
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
  },

  tenantB: async ({ playwright, baseURL }, use) => {
    const tenantId = randomUUID();
    const eventId = randomUUID();
    const userId = randomUUID();

    // Seed Tenant B
    const slug = `tenant-b-${randomUUID().slice(0, 8)}`;
    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Tenant B',
        slug,
        plan_type: 'basic',
        is_active: true,
      },
    });

    const userEmail = `user-b-${randomUUID().slice(0, 8)}@test.com`;
    const userName = 'User B';
    const username = `userb_${randomUUID().slice(0, 8)}`;
    await prisma.user.create({
      data: {
        id: userId,
        tenant_id: tenantId,
        email: userEmail,
        username,
        password_hash: bcrypt.hashSync('password123', 10),
        role: 'client',
        name: userName,
      },
    });

    const eventSlug = `event-b-${randomUUID().slice(0, 8)}`;
    await prisma.event.create({
      data: {
        id: eventId,
        tenant_id: tenantId,
        slug: eventSlug,
        bride_name: 'Bride B',
        groom_name: 'Groom B',
        event_date: new Date(),
        venue_name: 'Venue B',
        venue_address: 'Address B',
        venue_maps_url: 'http://maps.google.com',
        akad_start: '09:00',
        akad_end: '11:00',
        resepsi_start: '12:00',
        resepsi_end: '15:00',
        status: 'published',
      },
    });

    await prisma.eventConfig.create({
      data: {
        event_id: eventId,
        theme_config: {},
        active_sections: [],
        max_scanner_devices: 2,
        max_guests: 2000,
      },
    });

    const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';
    const token = jwt.sign(
      {
        sub: userId,
        tenant_id: tenantId,
        role: 'client',
        email: userEmail,
        name: userName,
      },
      jwtSecret
    );

    const context = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    await use({
      tenantId,
      eventId,
      userId,
      userEmail,
      token,
      username,
      request: context,
    });

    // Teardown Tenant B
    await context.dispose();
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
  },
});

export { expect };
