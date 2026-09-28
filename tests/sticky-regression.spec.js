// QA regresi 2026-09-29: sticky download bar harus muncul saat user MENGETIK
// (input event), bukan hanya saat klik. Ditemukan saat QA manual produksi.
import { test, expect } from '@playwright/test';

test('sticky bar muncul saat mengetik di nama/headline (mobile)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 780 });
  await page.goto('/');
  const sticky = page.locator('#sticky-download');
  await expect(sticky).toBeHidden();
  await page.fill('[name="nama"]', 'Rania QA');
  await expect(sticky).toBeVisible();
  // kosongkan lagi → hilang
  await page.fill('[name="nama"]', '');
  await expect(sticky).toBeHidden();
});
