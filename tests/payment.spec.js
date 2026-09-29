import { test, expect } from '@playwright/test';

test.describe('Halaman pembayaran Midtrans', () => {
  test('memuat script Snap dengan client key production', async ({ page }) => {
    await page.goto('/pay.html');
    const src = await page.getAttribute('script[data-client-key]', 'src');
    expect(src).toContain('app.midtrans.com/snap/snap.js');
    const key = await page.getAttribute('script[data-client-key]', 'data-client-key');
    expect(key).toMatch(/^Mid-client-/);
  });

  test('dua paket harga tampil dengan tombol beli', async ({ page }) => {
    await page.goto('/pay.html');
    await expect(page.locator('#btn-buy-9')).toBeVisible();
    await expect(page.locator('#btn-buy-19')).toBeVisible();
    await expect(page.locator('#btn-buy-39')).toBeVisible();
    await expect(page.locator('.paybox')).toContainText('Rp 9.900');
    await expect(page.locator('.paybox')).toContainText('Rp 19.000');
    await expect(page.locator('.paybox')).toContainText('Rp 39.000');
  });

  test('klik beli memanggil API pembayaran dan menampilkan status', async ({ page }) => {
    await page.route('**/api/pay/create', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'fake-token', redirect_url: 'https://app.midtrans.com/x',
                               order_id: 'CVK-TEST-1', amount: 19000, quota: 3 }),
      });
    });
    await page.goto('/pay.html');
    await page.click('#btn-buy-19');
    // Status harus berubah (Snap tidak muncul di test — fallback redirect)
    await expect(page.locator('#pay-status')).not.toBeEmpty();
  });

  test('kegagalan API ditampilkan dengan pesan ramah, bukan crash', async ({ page }) => {
    await page.route('**/api/pay/create', async (route) => {
      await route.fulfill({ status: 502, contentType: 'application/json',
                            body: JSON.stringify({ error: 'Gagal membuat pembayaran. Coba lagi.' }) });
    });
    await page.goto('/pay.html');
    await page.click('#btn-buy-19');
    await expect(page.locator('#pay-status')).toContainText(/Gagal/i);
  });

  test('customer support WhatsApp tersedia (hyperlink, tanpa nomor tampil)', async ({ page }) => {
    await page.goto('/pay.html');
    const wa = page.locator('a.cs-wa');
    await expect(wa).toBeVisible();
    await expect(wa).toHaveAttribute('href', /wa\.me\/6282118217075/);
    await expect(wa).not.toContainText(/\d{3}-\d{4}-\d{5}/); // nomor tidak ditampilkan sebagai teks
  });
});
