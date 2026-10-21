import { test, expect } from '@playwright/test';

test('Sentinel: prevent XSS in form fields', async ({ page }) => {
  await page.goto('/');

  // Insert XSS payload into a repeating field (e.g., Pendidikan)
  await page.click('[data-add="pendidikan"]');
  const xssPayload = '"><img src=x onerror=window.__xss_triggered=true>';

  // Need to find the input field and fill it
  const input = page.locator('[name="pendidikan.sekolah"]').last();
  await input.fill(xssPayload);

  // Trigger save/render
  await input.press('Tab');

  // Also check if entryHTML output renders it unsafely after reload
  await page.reload();

  // Ensure the page didn't execute the script
  const xssTriggered = await page.evaluate(() => window.__xss_triggered);
  expect(xssTriggered).toBeUndefined();
});
