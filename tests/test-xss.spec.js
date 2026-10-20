import { test, expect } from '@playwright/test';
test('XSS on entryHTML input value', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('cvkita_data_v1', JSON.stringify({
      lists: {
        pendidikan: [{ sekolah: '"><img src=x onerror="window.XSS=1">' }]
      }
    }));
  });
  await page.reload();
  const xss = await page.evaluate(() => window.XSS);
  expect(xss).toBeUndefined(); // Verify XSS is no longer executed
});
