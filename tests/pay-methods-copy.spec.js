// Copy metode bayar harus cocok dengan enabled_payments Worker yang sebenarnya
// (audit funnel 18 Okt: Snap live menampilkan VA Mandiri/BNI/BSI/Permata — BCA/BRI
// TIDAK aktif; menyebutnya di halaman dead-ends pembayar pengguna BCA).
// Plus urgency strip harga perkenalan (copy-level, tanpa klaim palsu).
import { test, expect } from '@playwright/test';

test('copy metode bayar menyebut hanya bank VA yang benar-benar aktif', async ({ page }) => {
  await page.goto('/pay.html');
  const body = await page.locator('main').innerText();
  expect(body).toContain('GoPay');
  expect(body).toContain('Virtual Account');
  for (const bank of ['Mandiri', 'BNI', 'BSI', 'Permata']) {
    expect(body).toContain(bank);
  }
  // Bank yang TIDAK aktif di Midtrans tidak boleh dijanjikan
  expect(body).not.toContain('BCA');
  expect(body).not.toContain('BRI');
});

test('ada urgency strip harga perkenalan', async ({ page }) => {
  await page.goto('/pay.html');
  const strip = page.locator('.pay-urgency');
  await expect(strip).toHaveCount(1);
  await expect(strip).toContainText(/harga perkenalan/i);
});
