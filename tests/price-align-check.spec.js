import { test, expect } from '@playwright/test';
test('harga baru align kiri persis di bawah harga coret', async ({ page }) => {
  await page.goto('/pay.html');
  const old_ = await page.locator('.tier-price-old').first().boundingBox();
  const price = await page.locator('.tier-price').first().boundingBox();
  expect(Math.abs(price.x - old_.x)).toBeLessThan(2); // mepet kiri sama
  expect(price.y).toBeGreaterThan(old_.y);           // di bawah harga coret
});
