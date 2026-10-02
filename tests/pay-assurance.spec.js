// Copy jaminan dekat CTA + onClose yang menawarkan lanjut (audit funnel 2 Okt).
import { test, expect } from '@playwright/test';

test('halaman bayar menampilkan jaminan "kode langsung tampil" di tiap tier', async ({ page }) => {
  await page.goto('/pay.html');
  const tiers = await page.locator('.tier').count();
  expect(tiers).toBe(3);
  // minimal SATU jaminan otomasi terlihat di halaman
  await expect(page.locator('.pay-assurance')).toHaveCount(1);
  const txt = await page.locator('.pay-assurance').first().innerText();
  expect(txt).toMatch(/kode aktivasi/i);
  expect(txt).toMatch(/langsung|otomatis/i);
});

test('menutup Snap menawarkan cara lanjut, bukan hanya menyatakan gagal', async ({ page }) => {
  await page.goto('/pay.html');
  // mock API: token palsu supaya alur sampai snap.pay
  await page.route('**/api/pay/create', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ token: 'TOK', order_id: 'CVK-TEST-1', amount: 9900, quota: 1 }) }));
  // mock snap.js: tahan opts supaya onClose bisa dipicu manual
  await page.evaluate(() => {
    window.snap = { pay: (token, opts) => { window.__snapOpts = opts; } };
  });
  await page.click('#btn-buy-9');
  await expect.poll(() => page.evaluate(() => !!window.__snapOpts)).toBe(true);
  await page.evaluate(() => window.__snapOpts.onClose());
  const status = await page.locator('#pay-status').innerText();
  expect(status).toMatch(/belum selesai|ditutup/i);
  // menawarkan jalan lanjut: QRIS/GoPay tetap bisa, atau WA CS
  expect(status).toMatch(/QRIS|GoPay|WhatsApp/i);
});
