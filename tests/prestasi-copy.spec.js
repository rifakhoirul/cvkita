import { test, expect } from '@playwright/test';

// 30 Sep: placeholder Prestasi diperjelas — user belum tahu cara nambah prestasi kedua.
test('placeholder Prestasi menjelaskan cara tambah baris', async ({ page }) => {
  await page.goto('/');
  const ta = page.locator('[name="prestasi"]');
  await expect(ta).toBeVisible();
  await expect(ta).toHaveAttribute('placeholder', /Satu prestasi per baris/i);
  await expect(ta).toHaveAttribute('placeholder', /Enter/i);
});
