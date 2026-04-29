import { test, expect } from '@playwright/test';
import { loginAs, EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD } from './helpers';

const ADMIN_ONLY_ROUTES = [
  '/dashboard/settings/global',
  '/dashboard/settings/billing',
  '/dashboard/settings/integrations',
  '/dashboard/settings/security',
];

const EMPLOYEE_ALLOWED_ROUTES = [
  '/dashboard/times',
  '/dashboard/time-account',
  '/dashboard/per-diem',
  '/dashboard/calendar',
  '/dashboard/chat',
];

// Supabase auth fires this when Playwright navigates mid-token-refresh — not a real app error
const NOISE = ['Failed to fetch', 'Failed to load resource', 'Load failed'];
const isNoise = (text: string) => NOISE.some(n => text.includes(n));

test.describe('Employee – access control', () => {
  test.beforeEach(async ({ page }) => {
    if (!EMPLOYEE_EMAIL || !EMPLOYEE_PASSWORD) test.skip();
    await loginAs(page, EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD);
  });

  for (const route of ADMIN_ONLY_ROUTES) {
    test(`${route} redirects away for employee`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'load', timeout: 15000 });
      // Wait for async redirect (user-context data loads then fires router.replace)
      await page.waitForURL(url => !url.pathname.includes(route.split('/').pop()!), { timeout: 10000 }).catch(() => {});
      const url = page.url();
      expect(url).not.toContain(route.split('/').pop()!);
    });
  }

  for (const route of EMPLOYEE_ALLOWED_ROUTES) {
    test(`employee can load ${route}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !isNoise(msg.text())) consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => {
        if (!isNoise(err.message)) consoleErrors.push(err.message);
      });

      const res = await page.goto(route, { waitUntil: 'load', timeout: 15000 });
      await page.screenshot({
        path: `e2e/screenshots/employee${route.replace(/\//g, '_')}.png`,
        fullPage: true,
      });

      expect(res?.status()).toBeLessThan(400);
      expect(consoleErrors).toHaveLength(0);
    });
  }
});
