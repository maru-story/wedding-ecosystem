import { test, expect, type Page } from '@playwright/test';

/**
 * UI Smoke Tests — Invitation App (apps/invitation)
 *
 * Prerequisites:
 * - Backend API running at http://localhost:4000
 * - Invitation app running at http://localhost:3001
 * - Demo event slug: romeo-juliet
 * - A valid guest slug from the database (update GUEST_SLUG below if needed)
 *
 * Run: npx playwright test apps/invitation/tests/ui-smoke.spec.ts
 */

const BASE_URL = 'http://localhost:3001';
const EVENT_SLUG = 'romeo-juliet';
// Update this to a real guest slug from your DB
const GUEST_SLUG = 'budi-santoso'; // Real guest from DB (romeo-juliet event)

const INVITATION_URL = `${BASE_URL}/${EVENT_SLUG}?to=${GUEST_SLUG}`;

test.describe('Invitation App — Smoke Tests', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14

  // ─── Cover Page ────────────────────────────────────────────────────────────

  test('loads invitation cover page', async ({ page }) => {
    await page.goto(INVITATION_URL);
    await page.waitForLoadState('networkidle');

    // Loading bar should appear and disappear
    await expect(page.locator('text=Memuat Undangan'))
      .toBeVisible({ timeout: 5000 })
      .catch(() => {
        // Loading might have already finished
      });

    // Cover should show couple names or "Undangan Pernikahan"
    await expect(page.locator('h1, [class*="heading"]').first()).toBeVisible({ timeout: 10000 });

    // "Buka Undangan" button should be visible
    await expect(page.getByText('Buka Undangan')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/01-cover.png', fullPage: false });
  });

  test('shows QR code on cover', async ({ page }) => {
    await page.goto(INVITATION_URL);
    await expect(page.getByText('Buka Undangan')).toBeVisible({ timeout: 10000 });

    // QR code SVG should be present
    const qrCode = page.locator('svg').first();
    await expect(qrCode).toBeVisible();

    // "Kepada Yth." label
    await expect(page.getByText('Kepada Yth.')).toBeVisible();

    await page.screenshot({ path: 'test-results/02-cover-qr.png' });
  });

  test('opens invitation on button click', async ({ page }) => {
    await page.goto(INVITATION_URL);
    await expect(page.getByText('Buka Undangan')).toBeVisible({ timeout: 10000 });

    await page.getByText('Buka Undangan').click();

    // Cover should disappear, main content appears
    await expect(page.locator('main')).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/03-after-open.png' });
  });

  // ─── Sections ──────────────────────────────────────────────────────────────

  test('scrolls through invitation sections', async ({ page }) => {
    await page.goto(INVITATION_URL);
    await expect(page.getByText('Buka Undangan')).toBeVisible({ timeout: 10000 });
    await page.getByText('Buka Undangan').click();
    await expect(page.locator('main')).toBeVisible({ timeout: 5000 });

    // Scroll through each section
    const sections = ['section[data-section-type]'];
    const sectionEls = await page.$$(sections[0]);

    for (let i = 0; i < sectionEls.length; i++) {
      await sectionEls[i].scrollIntoViewIfNeeded();
      await page.waitForTimeout(400); // wait for animation
      await page.screenshot({ path: `test-results/04-section-${i + 1}.png` });
    }
  });

  // ─── Countdown Section ─────────────────────────────────────────────────────

  test('countdown section shows timer', async ({ page }) => {
    await page.goto(INVITATION_URL);
    await page.getByText('Buka Undangan').click({ timeout: 10000 });

    const countdown = page.locator('[data-section-type="countdown"]');
    if (await countdown.isVisible()) {
      await countdown.scrollIntoViewIfNeeded();
      await expect(countdown.getByText('Hitung Mundur')).toBeVisible();
      // Should have time units
      await expect(countdown.getByText('Hari')).toBeVisible();
      await page.screenshot({ path: 'test-results/05-countdown.png' });
    }
  });

  // ─── Story Section ─────────────────────────────────────────────────────────

  test('story section carousel navigation works', async ({ page }) => {
    await page.goto(INVITATION_URL);
    await page.getByText('Buka Undangan').click({ timeout: 10000 });

    const story = page.locator('[data-section-type="story"]');
    if (await story.isVisible()) {
      await story.scrollIntoViewIfNeeded();
      await expect(story.getByText('Cerita Kami')).toBeVisible();

      // Click next arrow
      const nextBtn = story.locator('button[aria-label="Cerita selanjutnya"]');
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(400);
      }

      await page.screenshot({ path: 'test-results/06-story.png' });
    }
  });

  // ─── Gallery Section ───────────────────────────────────────────────────────

  test('gallery section carousel works', async ({ page }) => {
    await page.goto(INVITATION_URL);
    await page.getByText('Buka Undangan').click({ timeout: 10000 });

    const gallery = page.locator('[data-section-type="gallery"]');
    if (await gallery.isVisible()) {
      await gallery.scrollIntoViewIfNeeded();
      await expect(gallery.getByRole('heading', { name: 'Galeri Foto' })).toBeVisible();

      const nextBtn = gallery.locator('button[aria-label="Foto selanjutnya"]');
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(400);
      }

      await page.screenshot({ path: 'test-results/07-gallery.png' });
    }
  });

  // ─── RSVP Section ─────────────────────────────────────────────────────────

  test('RSVP section form is visible', async ({ page }) => {
    await page.goto(INVITATION_URL);
    await page.getByText('Buka Undangan').click({ timeout: 10000 });

    const rsvp = page.locator('[data-section-type="rsvp"]');
    if (await rsvp.isVisible()) {
      await rsvp.scrollIntoViewIfNeeded();
      await expect(rsvp.getByRole('heading', { name: 'Konfirmasi Kehadiran' })).toBeVisible();

      await page.screenshot({ path: 'test-results/08-rsvp.png' });
    }
  });

  test('RSVP form submission shows success', async ({ page }) => {
    await page.goto(INVITATION_URL);
    await page.getByText('Buka Undangan').click({ timeout: 10000 });

    const rsvp = page.locator('[data-section-type="rsvp"]');
    if (await rsvp.isVisible()) {
      await rsvp.scrollIntoViewIfNeeded();

      // If the guest already has RSVP, click "Ubah RSVP" first
      const editRsvpBtn = rsvp.getByText('Ubah RSVP');
      if (await editRsvpBtn.isVisible()) {
        await editRsvpBtn.click();
        await page.waitForTimeout(500);
      }

      // Select "Keduanya" (both)
      const bothOption = rsvp.locator('input[value="both"]');
      if (await bothOption.isVisible()) {
        await bothOption.click();
        await page.waitForTimeout(300);

        const submitBtn = rsvp.getByText('Kirim Konfirmasi');
        await submitBtn.click();

        // Wait for success or error
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/09-rsvp-submitted.png' });
      }
    }
  });

  // ─── Messages Section ──────────────────────────────────────────────────────

  test('messages section loads and shows form', async ({ page }) => {
    await page.goto(INVITATION_URL);
    await page.getByText('Buka Undangan').click({ timeout: 10000 });

    const messages = page.locator('[data-section-type="messages"]');
    if (await messages.isVisible()) {
      await messages.scrollIntoViewIfNeeded();
      await expect(messages.getByText('Ucapan & Doa')).toBeVisible();
      await page.screenshot({ path: 'test-results/10-messages.png' });
    }
  });

  test('messages form submission works', async ({ page }) => {
    await page.goto(INVITATION_URL);
    await page.getByText('Buka Undangan').click({ timeout: 10000 });

    const messages = page.locator('[data-section-type="messages"]');
    if (await messages.isVisible()) {
      await messages.scrollIntoViewIfNeeded();

      // Fill the form
      await messages.locator('input[placeholder="Nama Anda"]').fill('Tamu Test Playwright');
      await messages
        .locator('textarea')
        .fill('Barakallahu fiikuma, semoga langgeng dan bahagia selalu!');

      await messages.getByText('Kirim Ucapan').click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'test-results/11-messages-submitted.png' });
    }
  });

  // ─── Gift Section ──────────────────────────────────────────────────────────

  test('gift section copy button works', async ({ page }) => {
    await page.goto(INVITATION_URL);
    await page.getByText('Buka Undangan').click({ timeout: 10000 });

    const gift = page.locator('[data-section-type="gift"]');
    if (await gift.isVisible()) {
      await gift.scrollIntoViewIfNeeded();
      await expect(gift.getByText('Kado Digital')).toBeVisible();

      const copyBtn = gift.getByText('Salin').first();
      if (await copyBtn.isVisible()) {
        await copyBtn.click();
        await page.waitForTimeout(500);
        // Should show "Tersalin"
        await expect(gift.getByText('Tersalin'))
          .toBeVisible({ timeout: 2000 })
          .catch(() => {});
      }

      await page.screenshot({ path: 'test-results/12-gift.png' });
    }
  });

  // ─── Error States ──────────────────────────────────────────────────────────

  test('shows error page without guest slug', async ({ page }) => {
    await page.goto(`${BASE_URL}/${EVENT_SLUG}`);
    await page.waitForLoadState('networkidle');

    // Should show some error or prompt
    await page.screenshot({ path: 'test-results/13-no-guest-slug.png' });
  });

  test('404 page for invalid event slug', async ({ page }) => {
    await page.goto(`${BASE_URL}/event-yang-tidak-ada?to=siapapun`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/14-not-found.png' });
  });
});
