import { test, expect } from './fixtures/test-fixtures';

test.describe('Guests UI E2E', () => {
  test('should support full Guest CRUD and CSV Import lifecycle in UI', async ({
    page,
    tenantA,
  }) => {
    // Add logging for browser console and request failures
    page.on('console', (msg) => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('requestfailed', (req) =>
      console.log(`[BROWSER REQ FAILED] ${req.method()} ${req.url()}: ${req.failure()?.errorText}`)
    );
    page.on('requestfinished', async (req) => {
      const resp = await req.response();
      console.log(`[BROWSER REQ] ${req.method()} ${req.url()} -> ${resp?.status()}`);
    });

    // Navigate to local dashboard login page context first to allow setting localStorage
    await page.goto('http://localhost:3000/login');

    // Inject the generated tenant JWT token into localStorage
    await page.evaluate(
      ({ token, userId, tenantId }) => {
        localStorage.setItem('wedding_access_token', token);
        localStorage.setItem('wedding_refresh_token', 'dummy-refresh-token');
        localStorage.setItem('wedding_token_expiry', (Date.now() + 3600000).toString());

        const user = {
          id: userId,
          tenant_id: tenantId,
          email: 'user-a-test@test.com',
          name: 'User A',
          role: 'client',
        };
        localStorage.setItem('wedding_user', JSON.stringify(user));
      },
      { token: tenantA.token, userId: tenantA.userId, tenantId: tenantA.tenantId }
    );

    // Navigate to the guests page
    await page.goto('http://localhost:3000/guests');

    // 1. Verify Page Title
    await expect(page.locator('main h1')).toHaveText('Daftar Tamu');

    // 2. Create a Guest
    await page.click('button:has-text("+ Tambah Tamu")');
    await page.fill('#guest-name', 'Guest E2E UI Test');

    // Select group (VIP) using shadcn Select component selectors
    await page.click('button:has-text("Keluarga")'); // Default trigger
    await page.click('span:has-text("VIP")'); // Dropdown item

    await page.fill('#guest-phone', '628123456789');
    await page.fill('#guest-plus-one', '2');

    await page.click('button[type="submit"]:has-text("Tambah Tamu")');

    // Verify Guest appears in the table
    const row = page.locator('tr:has-text("Guest E2E UI Test")');
    await expect(row).toBeVisible();
    await expect(row.locator('td:nth-child(3)')).toContainText('VIP');
    await expect(row.locator('td:nth-child(6)')).toContainText('+2');

    // 3. Edit the Guest
    await row.locator('button[title="Edit tamu"]').click();
    await page.fill('#guest-name', 'Guest E2E UI Test Edited');
    await page.click('button:has-text("VIP")');
    await page.click('span:has-text("Teman")');
    await page.click('button[type="submit"]:has-text("Simpan Perubahan")');

    // Verify updated details
    const editedRow = page.locator('tr:has-text("Guest E2E UI Test Edited")');
    await expect(editedRow).toBeVisible();
    await expect(editedRow.locator('td:nth-child(3)')).toContainText('Teman');

    // 4. CSV Import
    await page.click('button:has-text("Import CSV")');
    await expect(page.locator('#import-modal-title')).toContainText('Import Tamu dari CSV');

    // Prepare CSV data matching Bahasa Indonesia headers
    const csvContent =
      'nama,grup,telepon\nAgus Budi E2E,family,628111222333\nCici Cantika E2E,vip,628222333444';

    // Mock the file input selection using Playwright
    const buffer = Buffer.from(csvContent, 'utf-8');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'guests.csv',
      mimeType: 'text/csv',
      buffer: buffer,
    });

    // Check successful import results in the modal
    await expect(page.locator('p:has-text("Import selesai")')).toBeVisible();
    await expect(
      page.locator('p:has-text("Total Baris")').locator('..').locator('p:first-child')
    ).toHaveText('2');
    await expect(
      page.locator('p:has-text("Berhasil")').locator('..').locator('p:first-child')
    ).toHaveText('2');
    await expect(
      page.locator('p:has-text("Gagal")').locator('..').locator('p:first-child')
    ).toHaveText('0');

    // Click "Selesai" to close the modal
    await page.click('button:has-text("Selesai")');

    // Verify imported guests appear in the list
    await expect(page.locator('tr:has-text("Agus Budi E2E")')).toBeVisible();
    await expect(page.locator('tr:has-text("Cici Cantika E2E")')).toBeVisible();

    // 5. Delete Guest
    // Handle confirmation dialog before clicking delete button
    await editedRow.locator('button[title="Hapus tamu"]').click();
    await page.click('button:has-text("Hapus Tamu")');
    await expect(editedRow).not.toBeVisible();

    // 6. Test Bulk Delete UI
    const rowAgus = page.locator('tr:has-text("Agus Budi E2E")');
    const rowCici = page.locator('tr:has-text("Cici Cantika E2E")');

    // Check the checkboxes for both
    await rowAgus.locator('button[role="checkbox"]').click();
    await rowCici.locator('button[role="checkbox"]').click();

    // Verify bulk delete banner appears
    await expect(page.locator('button:has-text("Hapus Terpilih")')).toBeVisible();
    await expect(page.locator('span:has-text("2 tamu terpilih")')).toBeVisible();

    // Click "Hapus Terpilih"
    await page.click('button:has-text("Hapus Terpilih")');
    await expect(page.locator('h2:has-text("Hapus Beberapa Tamu")')).toBeVisible();

    // Confirm bulk delete
    await page.locator('[role="dialog"]').locator('button:has-text("Hapus Terpilih")').click();

    // Verify they are gone
    await expect(rowAgus).not.toBeVisible();
    await expect(rowCici).not.toBeVisible();
  });
});
