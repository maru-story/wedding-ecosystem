import { test, expect } from './fixtures/test-fixtures';
import { createProductionPrismaClient } from '@wedding/db';

const prisma = createProductionPrismaClient();

test.describe('Send Invitation UI E2E', () => {
  test('should support template modification and single guest sending workflow', async ({ page, tenantA }) => {
    // Add logging
    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('requestfailed', req => console.log(`[BROWSER REQ FAILED] ${req.method()} ${req.url()}: ${req.failure()?.errorText}`));
    page.on('requestfinished', req => console.log(`[BROWSER REQ SUCCESS] ${req.method()} ${req.url()}`));

    // 1. Create a guest for tenantA's event
    const guestId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
    await prisma.guest.create({
      data: {
        id: guestId,
        event_id: tenantA.eventId,
        tenant_id: tenantA.tenantId,
        name: 'Guest E2E Send Test',
        slug: 'guest-e2e-send-test',
        phone: '+6287825515689',
        group: 'vip',
        type: 'invited',
        invitation_url: `/invitation-slug?to=guest-e2e-send-test`,
        delivery_status: 'not_sent',
      },
    });

    // 2. Login by injecting JWT token into localStorage
    await page.goto('http://localhost:3000/login');
    await page.evaluate(({ token, userId, tenantId }) => {
      localStorage.setItem('wedding_access_token', token);
      localStorage.setItem('wedding_refresh_token', 'dummy-refresh-token');
      localStorage.setItem('wedding_token_expiry', (Date.now() + 3600000).toString());
      
      const user = {
        id: userId,
        tenant_id: tenantId,
        email: 'user-a-test@test.com',
        name: 'User A',
        role: 'client'
      };
      localStorage.setItem('wedding_user', JSON.stringify(user));
    }, { token: tenantA.token, userId: tenantA.userId, tenantId: tenantA.tenantId });

    // 3. Navigate to Send Invitation Page
    await page.goto('http://localhost:3000/send-invitation');

    // 4. Verify Page Content
    await expect(page.locator('main h1')).toHaveText('Kirim Undangan');
    await expect(page.locator('tr:has-text("Guest E2E Send Test")')).toBeVisible();
    await expect(page.locator('tr:has-text("Guest E2E Send Test")').locator('span:has-text("Belum Dikirim")')).toBeVisible();

    // 5. Navigate to Template Tab & Save Custom Template
    await page.click('button:has-text("Template Pesan")');
    await expect(page.locator('text=Template Undangan WhatsApp')).toBeVisible();
    
    // Clear and fill template textarea
    await page.fill('#template-editor', 'Kepada Yth. {nama_tamu}, hadirlah di pernikahan kami: {link_undangan}');
    await page.click('button:has-text("Simpan Template")');
    
    // Verify success toast/message is shown
    await expect(page.locator('text=Template pesan berhasil diperbarui')).toBeVisible();

    // 6. Navigate back to Daftar Pengiriman and Send
    await page.click('button:has-text("Daftar Pengiriman")');
    
    // Mock window.open to avoid opening a real popup and prevent chrome-error pages when offline
    await page.evaluate(() => {
      (window as any).openedUrls = [];
      window.open = (url) => {
        (window as any).openedUrls.push(url);
        return window;
      };
    });

    await page.locator('tr:has-text("Guest E2E Send Test")').locator('button:has-text("Kirim WA")').click();
    
    // Verify window.open was called with the correct URL
    await expect.poll(async () => {
      return await page.evaluate(() => (window as any).openedUrls);
    }).toContainEqual(expect.stringContaining('api.whatsapp.com/send'));

    const openedUrls = await page.evaluate(() => (window as any).openedUrls);
    const popupUrl = openedUrls[0] as string;
    expect(popupUrl).toContain('api.whatsapp.com/send');
    expect(popupUrl).toContain('phone=6287825515689');
    expect(popupUrl).toContain(encodeURIComponent('Guest E2E Send Test'));

    // 7. Verify status has been updated in the table
    const dbGuest = await prisma.guest.findUnique({
      where: { id: guestId }
    });
    console.log(`[E2E TEST LOG] DB GUEST STATUS IS: ${dbGuest?.delivery_status}`);

    await expect(page.locator('tr:has-text("Guest E2E Send Test")').locator('span:has-text("Terkirim")')).toBeVisible();

    // Cleanup Guest
    await prisma.guest.delete({ where: { id: guestId } }).catch(() => {});
  });
});
