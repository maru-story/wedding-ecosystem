import { test, expect } from './fixtures/test-fixtures';
import path from 'path';
import fs from 'fs';

// Helper to get version from package.json
const getPackageVersion = (filePath: string): string => {
  try {
    const pkg = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
};

const paths = {
  dashboardPkg: path.resolve(__dirname, '../../../../apps/dashboard/package.json'),
  scannerPkg: path.resolve(__dirname, '../../../../apps/scanner/package.json'),
  apiPkg: path.resolve(__dirname, '../../../package.json'),
  invitationPkg: '/home/mochrafi/wedding-project/wedding-ecosystem-invitation/package.json',
  reportAssets: '/home/mochrafi/wedding-project/wedding-report-generate/assets',
};

test.describe('Release Screenshot Generator', () => {
  test('should capture screenshots for dashboard, scanner, and invitation applications using dev server', async ({
    page,
    tenantA,
  }) => {
    // 1. Get package versions dynamically
    const dashboardVersion = getPackageVersion(paths.dashboardPkg);
    const scannerVersion = getPackageVersion(paths.scannerPkg);
    const apiVersion = getPackageVersion(paths.apiPkg);
    const invitationVersion = getPackageVersion(paths.invitationPkg);

    console.log(`[Screenshot Generator] Detected versions:`);
    console.log(`- Dashboard: ${dashboardVersion}`);
    console.log(`- Scanner: ${scannerVersion}`);
    console.log(`- API: ${apiVersion}`);
    console.log(`- Invitation: ${invitationVersion}`);

    // Create target directories in report-generate assets
    const dirs = {
      dashboard: path.join(paths.reportAssets, 'dashboard', dashboardVersion),
      scanner: path.join(paths.reportAssets, 'scannner', scannerVersion), // note: scannner with 3 n's
      invitation: path.join(paths.reportAssets, 'invitation', invitationVersion),
      api: path.join(paths.reportAssets, 'backend-api', apiVersion),
    };

    for (const [key, dir] of Object.entries(dirs)) {
      if (!fs.existsSync(dir)) {
        console.log(`Creating directory for ${key}: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // 2. Login to Dashboard (Local Dev)
    console.log('Navigating to dashboard login page...');
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

    // Create a mock guest to ensure we have a valid guest slug and records
    console.log('Seeding a mock guest via API...');
    await tenantA.request.post('/guests', {
      data: {
        name: 'Budi Santoso',
        group: 'Keluarga',
        type: 'invited',
      },
    });

    // Go to dashboard overview
    console.log('Navigating to dashboard overview...');
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(3000); // Wait for charts to load

    // Set desktop screen size
    await page.setViewportSize({ width: 1280, height: 800 });

    // Capture Overview Page
    console.log('Capturing Dashboard Overview...');
    await page.screenshot({ path: path.join(dirs.dashboard, 'overview.png') });

    // Capture Guests Page
    console.log('Capturing Dashboard Guests...');
    await page.goto('http://localhost:3000/guests');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(dirs.dashboard, 'guests.png') });

    // Capture CMS Editor Page
    console.log('Capturing Dashboard CMS...');
    await page.goto('http://localhost:3000/cms');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(dirs.dashboard, 'cms.png') });

    // 3. Extract Event and Guest slug from Browser localStorage and Fetch API
    console.log('Retrieving event and guest details via browser fetch...');
    const result = await page.evaluate(async () => {
      const token = localStorage.getItem('wedding_access_token');
      if (!token) return null;

      try {
        // Fetch current event
        const eventRes = await fetch('http://localhost:4005/events/current', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const eventData = await eventRes.json();
        const eventSlug = eventData.data?.slug;

        // Fetch guests list to get a guest slug
        const guestsRes = await fetch('http://localhost:4005/guests?page=1&limit=5', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const guestsData = await guestsRes.json();
        const guestSlug = guestsData.data?.[0]?.slug || 'budi-santoso';

        return { eventSlug, guestSlug };
      } catch (err) {
        console.error('Error fetching data in browser evaluate:', err);
        return null;
      }
    });

    const eventSlug = result?.eventSlug || 'romeo-juliet';
    const guestSlug = result?.guestSlug || 'budi-santoso';
    console.log(`Resolved: eventSlug=${eventSlug}, guestSlug=${guestSlug}`);

    // 4. Capture Scanner Screens
    console.log('Navigating to Scanner PWA...');
    await page.goto('http://localhost:3002/');
    await page.setViewportSize({ width: 375, height: 812 });

    // Inject the generated tenant JWT token into Scanner's localStorage
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

    // Reload scanner page to apply credentials
    await page.goto('http://localhost:3002/');
    await page.waitForTimeout(3000);

    // Check if event selector screen is shown
    if (await page.locator('h1:has-text("Pilih Event")').isVisible()) {
      console.log('Selecting first published event in Scanner PWA...');
      // Click the first event button in the list
      await page.click('button.border-border\\/40');
      await page.waitForTimeout(2000);
    }

    // Capture Scanner PWA screen
    console.log('Capturing Scanner PWA Screen...');
    await page.screenshot({ path: path.join(dirs.scanner, 'scanner-home.png') });

    // 5. Capture Invitation Client Screen
    console.log('Navigating to Invitation Client...');
    await page.goto(`http://localhost:3001/${eventSlug}?to=${guestSlug}`);
    await page.waitForTimeout(3000); // Wait for envelope/minecraft animation to settle

    // If the envelope is closed, open the invitation
    const openButton = page.locator('button:has-text("Buka Undangan")');
    if (await openButton.isVisible()) {
      console.log('Opening invitation...');
      await openButton.click();
      await page.waitForTimeout(2000);
    }

    console.log('Capturing Invitation Client Screen...');
    await page.screenshot({ path: path.join(dirs.invitation, 'invitation-cover.png') });
    console.log('[Screenshot Generator] Done!');
  });
});
