import { test, expect } from '@playwright/test';

test('Stored XSS in CV fields (entryHTML)', async ({ page }) => {
  await page.goto('/');

  // Inject malicious data via localStorage
  await page.evaluate(() => {
    localStorage.setItem('cvkita_data_v1', JSON.stringify({
      lists: {
        pendidikan: [{ sekolah: '"><img src=x onerror="window.XSS_TRIGGERED=true">' }]
      }
    }));
  });

  await page.reload();
  await page.waitForTimeout(500);

  // Check if XSS was triggered
  const isXssTriggered = await page.evaluate(() => window.XSS_TRIGGERED === true);
  expect(isXssTriggered).toBe(false); // Should be false, currently it will be true if vulnerable
});
