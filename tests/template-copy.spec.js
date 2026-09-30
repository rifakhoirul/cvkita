import { test, expect } from '@playwright/test';

// Copy "N template premium" harus di-render dari PREMIUM_TEMPLATES (premium.js),
// bukan angka yang ditulis manual di HTML — supaya tidak tertinggal saat template ditambah.
// Koreksi owner 30 Sep: pay.html masih menulis "2" padahal produk sudah 4.

test('pay.html menampilkan jumlah template premium dari sumber kode', async ({ page }) => {
  await page.goto('/pay.html');
  const el = page.locator('[data-tpl-count]').first();
  await expect(el).toHaveText('4'); // PREMIUM_TEMPLATES.length saat ini
});

test('index.html daftar fitur pakai nama template yang di-render dari kode', async ({ page }) => {
  await page.goto('/');
  // Jika markup memakai data-tpl-names, isinya harus daftar nama lengkap
  const el = page.locator('[data-tpl-names]').first();
  if (await el.count()) {
    const txt = await el.textContent();
    for (const name of ['Executive', 'Tech', 'Creative', 'Elegant']) {
      expect(txt).toContain(name);
    }
  }
});

test('jumlah yang tampil == jumlah yang benar-benar terkunci di picker', async ({ page }) => {
  await page.goto('/');
  const lockedCount = await page.locator('.tpl-btn.locked').count();
  const shown = await page.locator('[data-tpl-count]').first().textContent().catch(() => null);
  const jsCount = await page.evaluate(() => (typeof PREMIUM_TEMPLATES !== 'undefined' ? PREMIUM_TEMPLATES.length : null));
  expect(jsCount).toBe(lockedCount);
  if (shown) expect(Number(shown)).toBe(lockedCount);
});
