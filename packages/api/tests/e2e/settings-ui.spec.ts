import { test, expect } from '@playwright/test';
import { createProductionPrismaClient } from '@wedding/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = createProductionPrismaClient();

test.describe('Settings UI E2E', () => {
  let tenantId: string;
  let userId: string;
  let token: string;
  let userEmail: string;
  let eventSlug: string;
  let eventId: string;

  test.beforeEach(async () => {
    tenantId = randomUUID();
    userId = randomUUID();
    userEmail = `settings-tenant-${randomUUID().slice(0, 8)}@test.com`;
    eventSlug = `settings-event-${randomUUID().slice(0, 8)}`;
    eventId = randomUUID();

    // 1. Create a tenant
    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Settings Tenant',
        slug: `settings-tenant-${randomUUID().slice(0, 8)}`,
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
        name: 'Client Owner Settings',
      },
    });

    // 3. Create an existing event
    await prisma.event.create({
      data: {
        id: eventId,
        tenant_id: tenantId,
        slug: eventSlug,
        bride_name: 'Juliet',
        groom_name: 'Romeo',
        event_date: new Date('2026-10-12'),
        venue_name: 'Gedung Kesenian Jakarta',
        venue_address: 'Jl. Gedung Kesenian No. 1, Jakarta',
        venue_maps_url: '',
        akad_start: '09:00',
        akad_end: '11:00',
        resepsi_start: '12:00',
        resepsi_end: '15:00',
        status: 'published',
      },
    });

    // 4. Generate JWT
    const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret';
    token = jwt.sign(
      {
        sub: userId,
        tenant_id: tenantId,
        role: 'client',
        email: userEmail,
        name: 'Client Owner Settings',
      },
      jwtSecret
    );
  });

  test.afterEach(async () => {
    // Cleanup databases
    await prisma.eventConfig
      .deleteMany({
        where: { event: { tenant_id: tenantId } },
      })
      .catch(() => {});

    await prisma.invitationSection
      .deleteMany({
        where: { event: { tenant_id: tenantId } },
      })
      .catch(() => {});

    await prisma.event
      .deleteMany({
        where: { tenant_id: tenantId },
      })
      .catch(() => {});

    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
  });

  test('should allow user to update event settings successfully', async ({ page }) => {
    page.on('console', (msg) => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('requestfailed', (req) =>
      console.log(`[BROWSER REQ FAILED] ${req.method()} ${req.url()}: ${req.failure()?.errorText}`)
    );
    page.on('requestfinished', (req) =>
      console.log(`[BROWSER REQ SUCCESS] ${req.method()} ${req.url()}`)
    );

    // Navigate to local dashboard login page context first to allow setting localStorage
    await page.goto('http://localhost:3000/login');

    // Inject the generated tenant JWT token into localStorage
    await page.evaluate(
      ({ token, userId, tenantId, email }) => {
        localStorage.setItem('wedding_access_token', token);
        localStorage.setItem('wedding_refresh_token', 'dummy-refresh-token');
        localStorage.setItem('wedding_token_expiry', (Date.now() + 3600000).toString());

        const user = {
          id: userId,
          tenant_id: tenantId,
          email: email,
          name: 'Client Owner Settings',
          role: 'client',
        };
        localStorage.setItem('wedding_user', JSON.stringify(user));
      },
      { token, userId, tenantId, email: userEmail }
    );

    // Navigate to /settings
    await page.goto('http://localhost:3000/settings');

    // Verify Settings Page Elements
    await expect(page.locator('main h1')).toHaveText('Pengaturan');

    // Verify form pre-population
    await expect(page.locator('input[name="groom_name"]')).toHaveValue('Romeo');
    await expect(page.locator('input[name="bride_name"]')).toHaveValue('Juliet');

    // Update details
    await page.fill('input[name="groom_name"]', 'Romano');
    await page.fill('input[name="bride_name"]', 'Julieta');
    await page.fill('input[name="venue_name"]', 'Ballroom Hotel Mulia');

    // Submit form
    await page.click('button[type="submit"]:has-text("Simpan Perubahan")');

    // Verify successful toast message (using text match)
    await expect(page.locator('text=Pengaturan pernikahan berhasil disimpan!')).toBeVisible();

    // Verify backend data was updated
    const updatedEvent = await prisma.event.findFirst({
      where: { tenant_id: tenantId },
    });
    expect(updatedEvent?.groom_name).toBe('Romano');
    expect(updatedEvent?.bride_name).toBe('Julieta');
    expect(updatedEvent?.venue_name).toBe('Ballroom Hotel Mulia');
  });

  test('should allow user to update account profile successfully', async ({ page }) => {
    // Navigate to local dashboard login page context first to allow setting localStorage
    await page.goto('http://localhost:3000/login');

    // Inject the generated tenant JWT token into localStorage
    await page.evaluate(
      ({ token, userId, tenantId, email }) => {
        localStorage.setItem('wedding_access_token', token);
        localStorage.setItem('wedding_refresh_token', 'dummy-refresh-token');
        localStorage.setItem('wedding_token_expiry', (Date.now() + 3600000).toString());

        const user = {
          id: userId,
          tenant_id: tenantId,
          email: email,
          name: 'Client Owner Settings',
          role: 'client',
        };
        localStorage.setItem('wedding_user', JSON.stringify(user));
      },
      { token, userId, tenantId, email: userEmail }
    );

    // Navigate to /settings
    await page.goto('http://localhost:3000/settings');

    // Click on "Pengaturan Akun" tab
    await page.click('button[role="tab"]:has-text("Pengaturan Akun")');

    // Verify profile inputs are pre-populated
    await expect(page.locator('input[id="profile_name"]')).toHaveValue('Client Owner Settings');
    await expect(page.locator('input[id="profile_email"]')).toHaveValue(userEmail);

    // Update details
    await page.fill('input[id="profile_name"]', 'New Client Name');
    await page.fill('input[id="profile_email"]', `new-${userEmail}`);

    // Submit profile form
    await page.click('button[type="submit"]:has-text("Simpan Profil")');

    // Verify successful toast message
    await expect(page.locator('text=Profil berhasil diperbarui!')).toBeVisible();

    // Verify backend data was updated
    const updatedUser = await prisma.user.findFirst({
      where: { id: userId },
    });
    expect(updatedUser?.name).toBe('New Client Name');
    expect(updatedUser?.email).toBe(`new-${userEmail}`);
  });

  test('should allow user to change account password successfully', async ({ page }) => {
    // Navigate to local dashboard login page context first to allow setting localStorage
    await page.goto('http://localhost:3000/login');

    // Inject the generated tenant JWT token into localStorage
    await page.evaluate(
      ({ token, userId, tenantId, email }) => {
        localStorage.setItem('wedding_access_token', token);
        localStorage.setItem('wedding_refresh_token', 'dummy-refresh-token');
        localStorage.setItem('wedding_token_expiry', (Date.now() + 3600000).toString());

        const user = {
          id: userId,
          tenant_id: tenantId,
          email: email,
          name: 'Client Owner Settings',
          role: 'client',
        };
        localStorage.setItem('wedding_user', JSON.stringify(user));
      },
      { token, userId, tenantId, email: userEmail }
    );

    // Navigate to /settings
    await page.goto('http://localhost:3000/settings');

    // Click on "Pengaturan Akun" tab
    await page.click('button[role="tab"]:has-text("Pengaturan Akun")');

    // Fill password form
    await page.fill('input[id="current_password"]', 'password123');
    await page.fill('input[id="new_password"]', 'newpassword123');
    await page.fill('input[id="confirm_password"]', 'newpassword123');

    // Submit password form
    await page.click('button[type="submit"]:has-text("Ubah Password")');

    // Verify successful toast message
    await expect(page.locator('text=Password berhasil diubah!')).toBeVisible();

    // Verify backend password hash was updated
    const updatedUser = await prisma.user.findFirst({
      where: { id: userId },
    });
    expect(updatedUser).not.toBeNull();
    const isNewPasswordValid = await bcrypt.compare('newpassword123', updatedUser!.password_hash);
    expect(isNewPasswordValid).toBe(true);
  });
});
