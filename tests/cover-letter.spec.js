import { test, expect } from '@playwright/test';

// Fitur premium Cover Letter (AI) — 29 Sep.
test('tombol Buat Cover Letter ada dan minta aktivasi kalau belum premium', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('#btn-cover-letter');
  await expect(btn).toBeVisible();
  await expect(btn).toContainText('Cover Letter');
  // Belum ada kode → paywall muncul SEBELUM prompt apa pun, tidak ada panggilan API
  let called = false;
  await page.route('**/api/cover-letter', r => { called = true; r.abort(); });
  let prompted = false;
  page.on('dialog', async d => { prompted = true; await d.dismiss(); });
  await btn.click();
  await expect(page.locator('#paywall')).not.toHaveClass(/hidden/);
  expect(called).toBe(false);
  expect(prompted).toBe(false);
});

test('kode tersimpan tapi TIDAK valid → paywall, tidak ada prompt perusahaan/posisi', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('cvkita_license_v1', 'CVK-SALAH-KODE'));
  await page.route('**/api/license/verify', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ valid: false, error: 'Kode tidak valid. Cek lagi atau hubungi kami.' }),
  }));
  let prompted = false;
  page.on('dialog', async d => { prompted = true; await d.dismiss(); });
  await page.locator('#btn-cover-letter').click();
  await expect(page.locator('#paywall')).not.toHaveClass(/hidden/);
  expect(prompted).toBe(false);
});

test('premium + nama terisi → hasil cover letter tampil di modal', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('cvkita_license_v1', 'CVK-TEST-ABCD');
  });
  await page.route('**/api/license/verify', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ valid: true, quota: 3 }),
  }));
  await page.route('**/api/cover-letter', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ text: 'Yth. Bapak/Ibu HRD, saya Rania...', remaining: 2 }),
  }));
  await page.fill('[name="nama"]', 'Rania Putri Andini');
  await page.locator('#btn-cover-letter').click();
  // modal tujuan lamaran muncul → isi & klik Buat
  await expect(page.locator('.cl-ask')).toBeVisible();
  await page.fill('#cl-perusahaan', 'PT Maju Jaya');
  await page.fill('#cl-posisi', 'Data Analyst');
  await page.locator('.cl-go').click();
  await expect(page.locator('.cl-modal')).toBeVisible();
  await expect(page.locator('.cl-text')).toContainText('Rania');
  await expect(page.locator('.cl-remaining')).toContainText('2');
  await page.locator('.cl-close').click();
  await expect(page.locator('.cl-modal')).toHaveCount(0);
});
