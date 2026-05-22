import { test, expect } from '@playwright/test';
import { createProductionPrismaClient } from '@wedding/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = createProductionPrismaClient();

test.describe('Onboarding UI E2E', () => {
  let tenantId: string;
  let userId: string;
  let token: string;
  let userEmail: string;
  let eventSlug: string;

  test.beforeEach(async () => {
    tenantId = randomUUID();
    userId = randomUUID();
    userEmail = `new-tenant-${randomUUID().slice(0, 8)}@test.com`;
    eventSlug = `new-event-${randomUUID().slice(0, 8)}`;

    // 1. Create a tenant without any events (Onboarding state)
    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'New Onboarding Tenant',
        slug: `new-tenant-${randomUUID().slice(0, 8)}`,
        plan_type: 'basic',
        is_active: true,
      },
    });

    // 2. Create the user
    await prisma.user.create({
      data: {
        id: userId,
        tenant_id: tenantId,
        email: userEmail,
        password_hash: bcrypt.hashSync('password123', 10),
        role: 'client',
        name: 'New Client Owner',
      },
    });

    // 3. Generate JWT
    const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';
    token = jwt.sign(
      {
        sub: userId,
        tenant_id: tenantId,
        role: 'client',
        email: userEmail,
        name: 'New Client Owner',
      },
      jwtSecret
    );
  });

  test.afterEach(async () => {
    // Cleanup databases
    await prisma.eventConfig.deleteMany({
      where: { event: { tenant_id: tenantId } }
    }).catch(() => {});

    await prisma.invitationSection.deleteMany({
      where: { event: { tenant_id: tenantId } }
    }).catch(() => {});

    await prisma.event.deleteMany({
      where: { tenant_id: tenantId }
    }).catch(() => {});

    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
  });

  test('should redirect new tenant to onboarding, complete it, and transition to dashboard', async ({ page }) => {
    // Add logging
    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('requestfailed', req => console.log(`[BROWSER REQ FAILED] ${req.method()} ${req.url()}: ${req.failure()?.errorText}`));
    page.on('requestfinished', req => console.log(`[BROWSER REQ SUCCESS] ${req.method()} ${req.url()}`));

    // Navigate to local dashboard login page context first to allow setting localStorage
    await page.goto('http://localhost:3000/login');

    // Inject the generated tenant JWT token into localStorage
    await page.evaluate(({ token, userId, tenantId, email }) => {
      localStorage.setItem('wedding_access_token', token);
      localStorage.setItem('wedding_refresh_token', 'dummy-refresh-token');
      localStorage.setItem('wedding_token_expiry', (Date.now() + 3600000).toString());

      const user = {
        id: userId,
        tenant_id: tenantId,
        email: email,
        name: 'New Client Owner',
        role: 'client'
      };
      localStorage.setItem('wedding_user', JSON.stringify(user));
    }, { token, userId, tenantId, email: userEmail });

    // Navigate to homepage "/" -> should redirect to "/onboarding" because useEvent returns null (404)
    await page.goto('http://localhost:3000/');

    // Assert that we are redirected to /onboarding
    await expect(page).toHaveURL(/.*\/onboarding/);

    // Verify Onboarding Page Elements
    await expect(page.locator('main h1')).toHaveText('Selamat Datang!');

    // Fill the onboarding form
    await page.fill('input[name="groom_name"]', 'Andi');
    await page.fill('input[name="bride_name"]', 'Siti');
    await page.fill('input[name="slug"]', eventSlug);
    await page.fill('input[name="event_date"]', '2026-10-12');
    await page.fill('input[name="venue_name"]', 'Gedung Kesenian Jakarta');
    await page.fill('textarea[name="venue_address"]', 'Jl. Gedung Kesenian No. 1, Sawah Besar, Jakarta Pusat');

    // Submit form
    await page.click('button[type="submit"]:has-text("Selesaikan Pendaftaran")');

    // Verify we are redirected back to the dashboard homepage "/" after successful creation
    await expect(page).toHaveURL('http://localhost:3000/');

    // On the homepage, since the event has now been created, we should see the dashboard elements
    await expect(page.locator('h2:has-text("Statistik Acara Saat Ini")')).toBeVisible();

    // Verify navigating back to "/onboarding" redirects back to dashboard home "/" (Onboarding reverse guard)
    await page.goto('http://localhost:3000/onboarding');
    await expect(page).toHaveURL('http://localhost:3000/');
  });
});
