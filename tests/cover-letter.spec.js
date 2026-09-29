import { test, expect } from '@playwright/test';

// Fitur premium Cover Letter (AI) — 29 Sep.
test('tombol Buat Cover Letter ada dan minta aktivasi kalau belum premium', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('#btn-cover-letter');
  await expect(btn).toBeVisible();
  await expect(btn).toContainText('Cover Letter');
  // Belum premium → paywall muncul, tidak ada panggilan API
  let called = false;
  await page.route('**/api/cover-letter', r => { called = true; r.abort(); });
  await btn.click();
  await expect(page.locator('#paywall')).not.toHaveClass(/hidden/);
  expect(called).toBe(false);
});

test('premium + nama terisi → hasil cover letter tampil di modal', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('cvkita_license_v1', 'CVK-TEST-ABCD');
  });
  await page.route('**/api/cover-letter', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ text: 'Yth. Bapak/Ibu HRD, saya Rania...', remaining: 2 }),
  }));
  await page.fill('[name="nama"]', 'Rania Putri Andini');
  page.on('dialog', d => d.accept('PT Maju Jaya'));
  await page.locator('#btn-cover-letter').click();
  await expect(page.locator('.cl-modal')).toBeVisible();
  await expect(page.locator('.cl-text')).toContainText('Rania');
  await expect(page.locator('.cl-remaining')).toContainText('2');
  await page.locator('.cl-close').click();
  await expect(page.locator('.cl-modal')).toHaveCount(0);
});
