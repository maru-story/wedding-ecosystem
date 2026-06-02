import { test, expect } from './fixtures/test-fixtures';

test.describe('Dashboard Improvements E2E', () => {
  test.beforeEach(async ({ page, tenantA }) => {
    // Add logging
    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('requestfailed', req => console.log(`[BROWSER REQ FAILED] ${req.method()} ${req.url()}: ${req.failure()?.errorText}`));
    page.on('requestfinished', async (req) => {
      const resp = await req.response();
      if (resp?.status() !== 200 && resp?.status() !== 201 && resp?.status() !== 204 && resp?.status() !== 304) {
        console.log(`[BROWSER REQ] ${req.method()} ${req.url()} -> ${resp?.status()}`);
      }
    });

    // Navigate to local dashboard login page context first to allow setting localStorage
    await page.goto('http://localhost:3000/login');
    
    // Inject the generated tenant JWT token into localStorage
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
  });

  test('Guest List: Should have perPage selector and correct capacity indicator', async ({ page, tenantA }) => {
    // 1. Create a few guests via API to ensure we have data
    for (let i = 1; i <= 25; i++) {
      await tenantA.request.post('/guests', {
        data: {
          name: `Bulk Guest ${i}`,
          group: 'family',
          type: 'invited',
        }
      });
    }

    await page.goto('http://localhost:3000/guests');
    await expect(page.locator('main h1').filter({ hasText: 'Daftar Tamu' })).toBeVisible({ timeout: 15000 });

    // 2. Test capacity indicator shows absolute total (25) even when filtered
    // Initially should show 25/2000
    await expect(page.locator('p:has-text("Kapasitas: 25 / 2000")')).toBeVisible({ timeout: 15000 });

    // 3. Test filtering by group (just check it triggers a request)
    await page.click('button:has-text("Semua Grup")');
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('group=family'), { timeout: 15000 }),
      page.click('[role="option"]:has-text("Keluarga")'),
    ]);
    
    // Indicator should STILL show 25/2000
    await expect(page.locator('p:has-text("Kapasitas: 25 / 2000")')).toBeVisible();

    // 4. Test perPage selector presence and basic functionality
    // Change to 10 per page
    await page.click('button:has-text("20 / halaman")');
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('per_page=10'), { timeout: 15000 }),
      page.click('[role="option"]:has-text("10 / halaman")'),
    ]);
    
    const tbody = page.locator('tbody');
    await expect(tbody.locator('tr')).toHaveCount(10);

    // Change to 100 per page (should now work after backend fix)
    await page.click('button:has-text("10 / halaman")');
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('per_page=100'), { timeout: 15000 }),
      page.click('[role="option"]:has-text("100 / halaman")'),
    ]);
    
    // We created 25 guests in setup, so it should show 25 rows
    await expect(tbody.locator('tr')).toHaveCount(25);
  });

  test('Send Invitation: Should have pagination and perPage selector', async ({ page, tenantA }) => {
    // Create 15 guests
    for (let i = 1; i <= 15; i++) {
      await tenantA.request.post('/guests', {
        data: {
          name: `Send Guest ${i}`,
          group: 'colleague',
          type: 'invited',
        }
      });
    }

    await page.goto('http://localhost:3000/send-invitation');
    await expect(page.locator('main h1').filter({ hasText: 'Kirim Undangan' })).toBeVisible({ timeout: 15000 });

    const tbody = page.locator('tbody');
    const rows = tbody.locator('tr');

    // Change to 10 per page
    await page.click('button:has-text("20 / halaman")'); 
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('per_page=10'), { timeout: 15000 }),
      page.click('[role="option"]:has-text("10 / halaman")'),
    ]);
    
    await expect(rows).toHaveCount(10);

    // Go to next page
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('page=2'), { timeout: 15000 }),
      page.click('button:has-text("Selanjutnya")'),
    ]);
    await expect(rows).toHaveCount(5);
  });

  test('Dashboard Homepage: Should display stats cards, tabs, and interactive charts', async ({ page }) => {
    // Navigate to homepage
    await page.goto('http://localhost:3000/');
    await expect(page.locator('h1:has-text("Dashboard Klien")')).toBeVisible({ timeout: 15000 });

    // Check stats cards are visible
    await expect(page.locator('p:has-text("Total Tamu")')).toBeVisible();
    await expect(page.locator('p:has-text("RSVP Masuk")')).toBeVisible();

    // Check that Tabs and Charts are rendered
    const preEventTabTrigger = page.locator('button[data-state="active"]:has-text("Pra-Acara")');
    await expect(preEventTabTrigger).toBeVisible();

    // Check Pre-Event charts are visible
    await expect(page.getByText('Estimasi Porsi Makanan (Pax)')).toBeVisible();
    await expect(page.getByText('Progress Pengiriman Undangan')).toBeVisible();
    await expect(page.locator('span:has-text("Total Estimasi Pax Hadir")')).toBeVisible();

    // Switch to Event Day tab
    await page.click('button[data-state="inactive"]:has-text("Hari-H")');
    
    // Check Event Day charts are visible
    await expect(page.getByText('Monitoring Tamu VIP')).toBeVisible();
    await expect(page.getByText('Pesan Ucapan & Doa Tamu')).toBeVisible();
    await expect(page.getByText('Grafik Waktu Puncak Check-In Tamu')).toBeVisible();
  });

  test('RSVP Tracking: Should display table, pagination, search, group, and status filters', async ({ page, tenantA }) => {
    // 1. Create a guest with plain phone number (to verify encryption-safety)
    const guestRes = await tenantA.request.post('/guests', {
      data: {
        name: 'RSVP Guest Test',
        group: 'family',
        type: 'invited',
        phone: '081234567890',
        plus_one_count: 1,
      }
    });
    expect(guestRes.ok()).toBe(true);
    const guestJson = await guestRes.json();
    console.log('GUEST CREATED:', JSON.stringify(guestJson));
    const guestId = guestJson.id || guestJson.data?.id;

    // 2. Submit RSVP for this guest
    const rsvpRes = await tenantA.request.post('/rsvp', {
      data: {
        guest_id: guestId,
        event_id: tenantA.eventId,
        attendance: 'both',
        guest_count: 2,
      }
    });
    if (!rsvpRes.ok()) {
      console.log('RSVP SUBMIT FAILED:', rsvpRes.status(), await rsvpRes.text());
    }
    expect(rsvpRes.ok()).toBe(true);

    // 3. Navigate to RSVP tracking page
    await page.goto('http://localhost:3000/rsvp');
    await expect(page.locator('main h1').filter({ hasText: 'Tracking RSVP' })).toBeVisible({ timeout: 15000 });

    // 4. Verify table row for RSVP is present and has the group, phone (decrypted/plain text), and status
    const tbody = page.locator('tbody');
    await expect(tbody.locator('tr')).toContainText('RSVP Guest Test');
    await expect(tbody.locator('tr')).toContainText('+6281234567890');
    await expect(tbody.locator('tr')).toContainText('Keluarga');

    // 5. Test search filter
    await page.fill('input[placeholder="Cari nama / telepon..."]', 'RSVP Guest Test');
    await expect(tbody.locator('tr')).toContainText('RSVP Guest Test');

    // Clear search
    await page.fill('input[placeholder="Cari nama / telepon..."]', 'Non-existent guest');
    await expect(page.getByText('RSVP Guest Test')).not.toBeVisible();
    await page.fill('input[placeholder="Cari nama / telepon..."]', '');

    // 6. Test Group Filter
    await page.click('button:has-text("Semua Grup")');
    await page.click('[role="option"]:has-text("Teman")');
    await expect(page.getByText('RSVP Guest Test')).not.toBeVisible();

    // Reset/Switch back to Keluarga
    await page.click('button:has-text("Teman")');
    await page.click('[role="option"]:has-text("Keluarga")');
    await expect(tbody.locator('tr')).toContainText('RSVP Guest Test');

    // 7. Test Status Filter
    await page.click('button:has-text("Semua Status")');
    await page.click('[role="option"]:has-text("Menolak")');
    await expect(page.getByText('RSVP Guest Test')).not.toBeVisible();

    // Reset status filter to Hadir Keduanya
    await page.click('button:has-text("Menolak")');
    await page.click('[role="option"]:has-text("Hadir Keduanya")');
    await expect(tbody.locator('tr')).toContainText('RSVP Guest Test');
  });
});
