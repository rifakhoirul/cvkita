import { test, expect } from '@playwright/test';

// Logo CVKita di header harus bisa diklik kembali ke halaman utama (semua halaman)
const pages = ['/', '/pay.html', '/terms.html', '/blog/'];
for (const p of pages) {
  test(`logo di ${p} adalah link ke "/"`, async ({ page }) => {
    await page.goto(p);
    const logo = page.locator('header .logo');
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('href', '/');
  });
}
