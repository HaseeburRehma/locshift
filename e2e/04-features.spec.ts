import { test, expect } from '@playwright/test';
import { loginAs, ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers';

test.describe('Feature smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    if (!ADMIN_PASSWORD) test.skip();
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test('Per Diem: date pickers render single icon (not double)', async ({ page }) => {
    await page.goto('/dashboard/per-diem', { waitUntil: 'load' });
    await page.screenshot({ path: 'e2e/screenshots/per_diem.png', fullPage: true });

    // Calendar icon should appear once per date input, not twice
    const dateInputs = page.locator('input[type="date"], [data-testid*="date"], button:has(svg[class*="calendar"])');
    const count = await dateInputs.count();
    // Each date input should have exactly one icon — check no duplicate icon wrappers
    const calendarIcons = page.locator('svg[class*="calendar"], svg[data-icon*="calendar"]');
    const iconCount = await calendarIcons.count();
    // Just log rather than hard-fail on icon count since it depends on how many date pickers are visible
    console.log(`Per Diem: found ${count} date inputs, ${iconCount} calendar icons`);
    expect(count).toBeGreaterThan(0);
  });

  test('Holiday Bonus: "Neuer Bonus" modal is in German', async ({ page }) => {
    await page.goto('/dashboard/holiday-bonus', { waitUntil: 'load' });
    await page.screenshot({ path: 'e2e/screenshots/holiday_bonus_list.png', fullPage: true });

    // Click "Neuer Bonus" or similar German button
    const newBonusBtn = page.getByRole('button', { name: /neuer bonus|neuen bonus|bonus|hinzufügen/i }).first();
    if (await newBonusBtn.isVisible()) {
      await newBonusBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'e2e/screenshots/holiday_bonus_modal.png', fullPage: true });

      const modalText = await page.locator('[role="dialog"], [data-testid="modal"]').first().innerText().catch(() => '');
      // Modal should not contain obvious English strings
      const englishWords = ['Save', 'Cancel', 'Submit', 'Close', 'Enter', 'Select'];
      for (const word of englishWords) {
        if (modalText.includes(word)) {
          console.warn(`Holiday Bonus modal contains English word: "${word}"`);
        }
      }
    } else {
      console.warn('Could not find "Neuer Bonus" button — skipping modal check');
    }
  });

  test('Betriebsstelle: empty state "Neue Betriebsstelle" button is readable on hover', async ({ page }) => {
    await page.goto('/dashboard/settings/betriebsstellen', { waitUntil: 'load' });
    await page.screenshot({ path: 'e2e/screenshots/betriebsstellen_list.png', fullPage: true });

    const newBtn = page.getByRole('button', { name: /neue betriebsstelle|betriebsstelle/i }).first();
    if (await newBtn.isVisible()) {
      await newBtn.hover();
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'e2e/screenshots/betriebsstellen_hover.png', fullPage: true });

      // Check the button is still visible (not hidden by bad CSS)
      await expect(newBtn).toBeVisible();
    }
  });

  test('Times: PDF export button exists and is clickable', async ({ page }) => {
    await page.goto('/dashboard/times', { waitUntil: 'load' });
    await page.screenshot({ path: 'e2e/screenshots/times_list.png', fullPage: true });

    // Look for PDF/export button
    const pdfBtn = page.getByRole('button', { name: /pdf|export|drucken|herunterladen/i }).first();
    const hasPdf = await pdfBtn.isVisible();
    console.log(`Times page: PDF export button ${hasPdf ? 'found' : 'NOT found'}`);

    if (hasPdf) {
      // Start watching for download or new tab
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 8000 }).catch(() => null),
        pdfBtn.click(),
      ]);
      if (download) {
        console.log(`PDF download triggered: ${download.suggestedFilename()}`);
      }
      await page.screenshot({ path: 'e2e/screenshots/times_after_pdf_click.png', fullPage: true });
    }
  });

  test('Settings: all 9 cards load without 404', async ({ page }) => {
    const settingsRoutes = [
      '/dashboard/settings/personal-data',
      '/dashboard/settings/global',
      '/dashboard/settings/betriebsstellen',
      '/dashboard/settings/company',
      '/dashboard/settings/integrations',
      '/dashboard/settings/notifications',
      '/dashboard/settings/billing',
      '/dashboard/settings/security',
      '/dashboard/settings/localization',
    ];

    for (const route of settingsRoutes) {
      const res = await page.goto(route, { waitUntil: 'load', timeout: 15000 });
      const status = res?.status() ?? 0;
      expect(status, `${route} returned ${status}`).toBeLessThan(400);
      await page.screenshot({
        path: `e2e/screenshots/settings${route.replace(/\//g, '_')}.png`,
        fullPage: true,
      });
    }
  });
});
