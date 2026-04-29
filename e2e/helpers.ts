import { Page } from '@playwright/test';

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'design@tylotech.de';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
export const EMPLOYEE_EMAIL = process.env.EMPLOYEE_EMAIL || '';
export const EMPLOYEE_PASSWORD = process.env.EMPLOYEE_PASSWORD || '';

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'commit' });

  // If middleware already redirected us to dashboard (session still alive), we're done
  if (page.url().includes('/dashboard')) return;

  // Wait for the page to settle
  await page.waitForLoadState('load', { timeout: 10000 }).catch(() => {});

  // If we ended up on dashboard after networkidle, done
  if (page.url().includes('/dashboard')) return;

  // Step 1: click "Anmelden" / "Login" to reveal the email/password form
  // The login page shows a splash + button before showing the actual form
  const loginBtn = page.getByRole('button', { name: /^anmelden$|^login$|^sign in$/i }).first();
  try {
    await loginBtn.waitFor({ state: 'visible', timeout: 8000 });
    await loginBtn.click();
  } catch {
    // Button might not exist if we're already on the form or were redirected
    if (page.url().includes('/dashboard')) return;
  }

  // Step 2: fill email/password (inputs identified by type, labels aren't linked via htmlFor)
  await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);

  // Step 3: submit (last button named "Anmelden" on the form)
  await page.getByRole('button', { name: /^anmelden$|^sign in$/i }).last().click();

  // Step 4: login uses window.location.replace; wait for the URL to become /dashboard
  await page.waitForURL('**/dashboard**', { timeout: 30000, waitUntil: 'commit' });

  // Give the page a moment to hydrate before the test starts navigating
  await page.waitForLoadState('load', { timeout: 10000 }).catch(() => {});
}
