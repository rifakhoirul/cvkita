import { test, expect } from '@playwright/test';

// Bug report user (29 Sep): tombol "Unduh PDF" tidak berfungsi di desktop mode.
// Akar: handler pakai e.target.id — klik pada <svg>/<use> ikon tidak cocok id apa pun.
test.describe('Unduh PDF desktop', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('klik IKON tombol unduh memicu print', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
    await page.fill('[name="nama"]', 'Rania Putri Andini');
    const btn = page.locator('#btn-download');
    await expect(btn).toBeVisible();
    await btn.locator('svg').click();
    expect(await page.evaluate(() => window.__printed)).toBe(1);
  });

  test('klik TEKS tombol unduh memicu print', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
    await page.locator('#btn-download').click();
    expect(await page.evaluate(() => window.__printed)).toBe(1);
  });
});

test.describe('Unduh PDF sticky (mobile)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('klik IKON tombol sticky memicu print', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
    await page.fill('[name="nama"]', 'Rania Putri Andini');
    const btn = page.locator('#btn-download-sticky');
    await expect(btn).toBeVisible();
    await btn.locator('svg').click();
    expect(await page.evaluate(() => window.__printed)).toBe(1);
  });
});
