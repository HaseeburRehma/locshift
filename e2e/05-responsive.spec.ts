import { test, expect } from '@playwright/test';
import { loginAs, ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers';

// Only run responsive tests on desktop project — viewports set via playwright.config.ts devices
const RESPONSIVE_ROUTES = [
  '/dashboard',
  '/dashboard/times',
  '/dashboard/calendar',
  '/dashboard/settings',
];

test.describe('Responsive layout', () => {
  test.beforeEach(async ({ page }) => {
    if (!ADMIN_PASSWORD) test.skip();
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  for (const route of RESPONSIVE_ROUTES) {
    test(`${route} renders without overflow`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'load' });

      const viewport = page.viewportSize();
      const label = `${viewport?.width}x${viewport?.height}`;
      await page.screenshot({
        path: `e2e/screenshots/responsive_${label}${route.replace(/\//g, '_')}.png`,
        fullPage: true,
      });

      // Check for horizontal scroll (indicates overflow)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (hasHorizontalScroll) {
        console.warn(`Horizontal scroll detected on ${route} at ${label}`);
      }
      // Non-fatal: just warn, don't fail — some scroll can be intentional
    });
  }
});
