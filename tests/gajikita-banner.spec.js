// HG-007 — Banner cross-promo GajiCVKita di CVKita (cvmaker-id).
// AC: banner rujukan terpasang di halaman sukses CV (setelah unduh PDF).
import { test, expect } from '@playwright/test';

test.describe('Banner cross-promo GajiCVKita', () => {
  test('banner tersembunyi sebelum unduh PDF', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#hg-banner')).toBeHidden();
  });

  test('banner muncul setelah klik unduh PDF', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => {
      // window.print di-mock supaya test tidak membuka dialog print
      window.print = () => {};
    });
    await page.click('#btn-download');
    await expect(page.locator('#hg-banner')).toBeVisible();
    const href = await page.locator('#hg-banner a').getAttribute('href');
    expect(href).toContain('gaji.cvkita.id');
  });

  test('banner hanya muncul sekali per sesi (sessionStorage)', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => {
      window.print = () => {};
      sessionStorage.setItem('hg_banner_seen', '1');
    });
    await page.click('#btn-download');
    await expect(page.locator('#hg-banner')).toBeHidden();
  });
});
