import { test, expect, Page } from '@playwright/test';
import { loginAs, ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers';

const ADMIN_ROUTES = [
  '/dashboard',
  '/dashboard/live',
  '/dashboard/calendar',
  '/dashboard/plans',
  '/dashboard/times',
  '/dashboard/time-account',
  '/dashboard/per-diem',
  '/dashboard/holiday-bonus',
  '/dashboard/customers',
  '/dashboard/reports',
  '/dashboard/chat',
  '/dashboard/users',
  '/dashboard/settings',
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

// These domains/paths produce expected non-critical errors (push subscription, analytics, etc.)
const IGNORABLE_URL_PATTERNS = [
  'push',
  'subscription',
  'analytics',
  'favicon',
  '_next',
  'hotjar',
  'intercom',
];

function isIgnorable(url: string) {
  return IGNORABLE_URL_PATTERNS.some(p => url.includes(p));
}

test.describe('Admin – route smoke test', () => {
  test.beforeEach(async ({ page }) => {
    if (!ADMIN_PASSWORD) test.skip();
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  for (const route of ADMIN_ROUTES) {
    test(`loads ${route} without red errors`, async ({ page }) => {
      // "Failed to load resource" console errors are duplicates of network failures — skip them
      const jsErrors: string[] = [];
      const networkFails: { status: number; url: string }[] = [];

      // Noise patterns: browser-generated errors that aren't real app bugs.
      // "Failed to load resource" / "Failed to fetch" = network errors already caught by the
      //   response listener. "Load failed" = Playwright navigation abort of in-flight requests.
      const NOISE = ['Failed to load resource', 'Failed to fetch', 'Load failed'];
      const isNoise = (text: string) => NOISE.some(n => text.includes(n));

      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!isNoise(text)) jsErrors.push(text);
        }
      });
      page.on('pageerror', err => {
        if (!isNoise(err.message)) jsErrors.push(err.message);
      });
      page.on('response', res => {
        const url = res.url();
        if (res.status() >= 400 && !isIgnorable(url)) {
          networkFails.push({ status: res.status(), url });
        }
      });

      const response = await page.goto(route, { waitUntil: 'load', timeout: 30000 });
      await page.screenshot({
        path: `e2e/screenshots/admin${route.replace(/\//g, '_')}_de.png`,
        fullPage: true,
      });

      // Page itself should not 404/500
      expect(response?.status(), `${route} returned ${response?.status()}`).toBeLessThan(400);

      // Report network failures as warnings, hard-fail on 5xx only
      const serverErrors = networkFails.filter(f => f.status >= 500);
      if (networkFails.length > 0) {
        console.warn(`[${route}] Network 4xx/5xx:`, networkFails.map(f => `${f.status} ${f.url}`).join('\n'));
      }
      expect(
        serverErrors,
        `5xx errors on ${route}:\n${serverErrors.map(f => `${f.status} ${f.url}`).join('\n')}`
      ).toHaveLength(0);

      // Hard-fail on JS runtime errors
      if (jsErrors.length > 0) {
        console.warn(`[${route}] JS errors:`, jsErrors);
      }
      expect(jsErrors, `JS errors on ${route}: ${jsErrors.join(', ')}`).toHaveLength(0);
    });
  }
});
