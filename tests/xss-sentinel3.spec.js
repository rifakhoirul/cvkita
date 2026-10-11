import { test, expect } from '@playwright/test';

test('Sentinel XSS Check in entryHTML with input rendering', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    // This function creates new entry when we click "Tambah"
    const data = { sekolah: '"><img src=x onerror="window.xss=1">' };
    // We need to inject the function into the page context
  });

  await page.evaluate(() => {
     window.document.querySelector('#pendidikan-list').innerHTML = window.entryHTML('pendidikan', { sekolah: '"><img src=x onerror="window.xss=1">' });
  });

  // wait for potential image error to trigger
  await page.waitForTimeout(500);

  const hasXSS = await page.evaluate(() => window.xss === 1);
  expect(hasXSS).toBe(false); // Should be false now since XSS is mitigated
});
