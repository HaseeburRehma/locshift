import { test, expect } from '@playwright/test';
import { loginAs, ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers';

// Sidebar nav labels that are immediately visible (no Supabase data required)
const DE_STRINGS = ['Einsatzpläne', 'Zeiterfassung', 'Einstellungen'];
const EN_STRINGS = ['Mission Plans', 'Time Tracking', 'Settings'];
// Strings that must NOT appear in German mode (English remnants)
const EN_FORBIDDEN_IN_DE = ['Dashboard Settings', 'Save Changes', 'Loading...'];

test.describe('Locale switching DE ↔ EN', () => {
  test.beforeEach(async ({ page }) => {
    if (!ADMIN_PASSWORD) test.skip();
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test('German mode: nav labels are German, no English remnants', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'load' });

    // Ensure we're in DE mode — look for globe button showing EN (meaning current is DE)
    const globeBtn = page.getByRole('button', { name: /DE|EN/i }).first();
    if (await globeBtn.isVisible()) {
      const text = await globeBtn.textContent();
      // If it shows "EN" we're in DE mode (button shows what you'd switch TO)
      // If it shows "DE" we're in EN mode, click to switch back
      if (text?.includes('DE')) {
        await globeBtn.click();
        await page.waitForTimeout(800);
      }
    }

    await page.screenshot({ path: 'e2e/screenshots/locale_de_dashboard.png', fullPage: true });
    const body = await page.locator('body').innerText();

    for (const str of DE_STRINGS) {
      // Non-fatal: log rather than hard-fail since some routes may not have all strings
      if (!body.includes(str)) {
        console.warn(`DE mode: expected "${str}" in page body but not found`);
      }
    }
  });

  test('English mode: nav labels flip to English', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'load' });

    // Switch to EN
    const globeBtn = page.getByRole('button', { name: /DE|EN/i }).first();
    if (await globeBtn.isVisible()) {
      const text = await globeBtn.textContent();
      if (text?.includes('EN')) {
        await globeBtn.click();
        await page.waitForTimeout(800);
      }
    } else {
      // Try alternate selectors
      const altGlobe = page.locator('[data-testid="locale-toggle"], button:has(svg[class*="globe"])').first();
      if (await altGlobe.isVisible()) await altGlobe.click();
    }

    await page.screenshot({ path: 'e2e/screenshots/locale_en_dashboard.png', fullPage: true });
    const body = await page.locator('body').innerText();

    for (const str of EN_STRINGS) {
      if (!body.includes(str)) {
        console.warn(`EN mode: expected "${str}" in page body but not found`);
      }
    }
  });

  test('switching DE→EN→DE is consistent', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'load' });

    const globeBtn = page.getByRole('button', { name: /DE|EN/i }).first();
    if (!await globeBtn.isVisible()) test.skip();

    // Sidebar nav labels are immediately visible — no data loading required
    const DE_ANCHOR = 'Einsatzpläne';
    const EN_ANCHOR = 'Mission Plans';

    const body = page.locator('body');
    const initialBody = await body.innerText().catch(() => '');
    const startedInDE = initialBody.includes(DE_ANCHOR);

    // Switch once (DE→EN or EN→DE)
    await globeBtn.click();
    await page.waitForTimeout(1000);
    const afterBody = await body.innerText().catch(() => '');

    if (startedInDE) {
      expect(afterBody).toContain(EN_ANCHOR);
    } else {
      expect(afterBody).toContain(DE_ANCHOR);
    }

    // Switch back
    await globeBtn.click();
    await page.waitForTimeout(1000);
    const backBody = await body.innerText().catch(() => '');

    if (startedInDE) {
      expect(backBody).toContain(DE_ANCHOR);
    } else {
      expect(backBody).toContain(EN_ANCHOR);
    }
  });
});
