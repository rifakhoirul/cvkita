import { test, expect } from '@playwright/test';

// Bug 2026-09-28: modal paywall tidak bisa ditutup — user terjebak.
// Regresi: modal WAJIB punya tombol tutup dan K bisa kembali memakai editor.
test('paywall bisa ditutup dengan tombol X dan editor kembali bisa dipakai', async ({ page }) => {
  await page.goto('/');
  await page.fill('[name="nama"]', 'Budi Test');
  // Picu paywall lewat template premium (butuh premium)
  await page.click('#btn-sample-top');
  await page.click('[data-sample="it"]');
  // Buka paywall: pilih template premium
  const tplTrigger = page.locator('.tpl-btn[data-tpl="executive"], [data-tpl="executive"]').first();
  await tplTrigger.click();
  const paywall = page.locator('#paywall');
  await expect(paywall).toBeVisible();

  // Harus ada tombol tutup yang terlihat & touch-friendly
  const close = page.locator('#btn-close-paywall');
  await expect(close).toBeVisible();

  await close.click();
  await expect(paywall).toBeHidden();

  // Editor kembali interaktif setelah modal tertutup
  await expect(page.locator('[name="nama"]')).toBeEditable();
});

test('klik area gelap di luar kartu juga menutup paywall', async ({ page }) => {
  await page.goto('/');
  await page.click('#btn-sample-top');
  await page.click('[data-sample="it"]');
  const tplTrigger = page.locator('.tpl-btn[data-tpl="executive"], [data-tpl="executive"]').first();
  await tplTrigger.click();
  await expect(page.locator('#paywall')).toBeVisible();
  await page.locator('#paywall').click({ position: { x: 5, y: 5 } });
  await expect(page.locator('#paywall')).toBeHidden();
});
