// Test UX pay.html (29 Sep): harga diskon (anchor dicoret), chip UPPERCASE,
// copy metode bayar hanya GoPay + VA.
import { test, expect } from '@playwright/test';

test('harga paket tampil dengan harga asli dicoret (anchor diskon)', async ({ page }) => {
  await page.goto('/pay.html');
  // Ketiga tier punya harga asli dicoret
  await expect(page.locator('.tier-price-old')).toHaveCount(3);
  // Tier pertama: harga baru 9.900, asli 19.900
  const first = page.locator('.pay-item.tier').first();
  await expect(first.locator('.tier-price-old')).toContainText('Rp 19.900');
  await expect(first.locator('.tier-price')).toContainText('Rp 9.900');
  // Persentase hemat tampil
  await expect(page.locator('.tier-save').first()).toContainText('50%');
});

test('chip termurah & paling laris pakai UPPERCASE', async ({ page }) => {
  await page.goto('/pay.html');
  await expect(page.locator('.badge-muted')).toHaveText('TERMURAH');
  await expect(page.locator('.badge-hot')).toHaveText('PALING LARIS');
});

test('copy hanya menyebut GoPay dan VA (tanpa QRIS/ShopeePay)', async ({ page }) => {
  await page.goto('/pay.html');
  const body = await page.locator('main').innerText();
  expect(body).toContain('GoPay');
  expect(body).toContain('Virtual Account');
  expect(body).not.toContain('ShopeePay');
  expect(body).not.toContain('QRIS, GoPay, ShopeePay');
});
