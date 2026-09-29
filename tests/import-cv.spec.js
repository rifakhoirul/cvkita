// QA 2026-09-29: fitur impor CV PDF (gratis) — UI muncul, status ditampilkan, gagal → pesan jelas
import { test, expect } from '@playwright/test';

test('label impor CV terlihat & input file ada', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.import-cv')).toBeVisible();
  await expect(page.locator('#import-file')).toHaveCount(1);
  await expect(page.locator('#import-status')).toBeHidden();
});

test('file bukan PDF terlalu kecil → status error tampil, tidak crash', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('#import-file', {
    name: 'tiny.pdf', mimeType: 'application/pdf', buffer: Buffer.from('kecil'),
  });
  await expect(page.locator('#import-status')).toBeVisible();
  await expect(page.locator('#import-status')).toContainText(/tidak terbaca|besar|Gagal/);
});
