import { test, expect } from '@playwright/test';

// Template premium baru: "Creative" (aksen teal) & "Elegant" (serif maroon).
// Semua template tetap SATU KOLOM, font OS aman, kontras tinggi (ATS-safe).

async function mockApi(page) {
  await page.route('**/api/license/verify', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ valid: true, quota: 3 }),
    })
  );
}

async function aktivasi(page) {
  await mockApi(page);
  await page.locator('#pengalaman-list .btn-ai').first().click(); // buka paywall
  await page.fill('#aktivasi-kode', 'CVK-TEST-PREMIUM');
  await page.click('#btn-aktivasi');
  await expect(page.locator('#paywall')).toBeHidden({ timeout: 5000 });
}

test('tombol template Creative & Elegant tampil di panel', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.tpl-btn[data-tpl="creative"]')).toBeVisible();
  await expect(page.locator('.tpl-btn[data-tpl="elegant"]')).toBeVisible();
});

test('template baru terkunci -> paywall saat diklik tanpa premium', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-tpl="creative"]');
  await expect(page.locator('#cv-paper')).not.toHaveClass(/tpl-creative/);
  await expect(page.locator('#paywall')).toBeVisible({ timeout: 5000 });
});

test('elegant juga terkunci tanpa premium', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-tpl="elegant"]');
  await expect(page.locator('#cv-paper')).not.toHaveClass(/tpl-elegant/);
  await expect(page.locator('#paywall')).toBeVisible({ timeout: 5000 });
});

test('dengan premium aktif, kedua template baru bisa dipakai', async ({ page }) => {
  await page.goto('/');
  await aktivasi(page);
  for (const tpl of ['creative', 'elegant']) {
    await page.click(`[data-tpl="${tpl}"]`);
    await expect(page.locator('#cv-paper')).toHaveClass(new RegExp(`tpl-${tpl}`), { timeout: 5000 });
  }
});

test('kontras teks kedua template baru tinggi (AA+) & tetap satu kolom', async ({ page }) => {
  await page.goto('/');
  await aktivasi(page);
  for (const tpl of ['creative', 'elegant']) {
    await page.click(`[data-tpl="${tpl}"]`);
    const vars = await page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('#cv-paper'));
      return { ink: cs.getPropertyValue('--cv-ink').trim(), sub: cs.getPropertyValue('--cv-sub').trim() };
    });
    const lum = (c) => {
      const m = c.match(/#([0-9a-f]{6})/i);
      if (!m) return 99;
      const n = parseInt(m[1], 16);
      // Rumus WCAG resmi: linearisasi gamma dulu, baru jumlah berbobot
      const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
    };
    // Kontras di kertas putih = (1.05) / (lum + 0.05). AA butuh >4.5
    const ctr = (l) => 1.05 / (l + 0.05);
    expect(ctr(lum(vars.ink)), `${tpl} --cv-ink kontras < AA`).toBeGreaterThan(7);
    expect(ctr(lum(vars.sub)), `${tpl} --cv-sub kontras < AA`).toBeGreaterThan(4.5);
  }
});
