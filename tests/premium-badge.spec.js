// QA 2026-09-29: setelah aktivasi lisensi, TIDAK ADA indikator premium di UI.
// User bingung "apakah kode saya sudah aktif?".
// Fix: badge "Premium Aktif" muncul di header + tombol AI tidak lagi memicu paywall.
import { test, expect } from '@playwright/test';

test.describe('Indikator premium aktif', () => {
  test('tanpa lisensi: badge premium tersembunyi', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#premium-badge')).toBeHidden();
  });

  test('dengan lisensi: badge Premium Aktif terlihat di header', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('cvkita_license_v1', 'CVK-64Y3-CT97'));
    await page.goto('/');
    const badge = page.locator('#premium-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Premium');
  });

  test('aktivasi via form (tanpa reload) langsung memunculkan badge', async ({ page }) => {
    await page.route('**/api/license/verify', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ valid: true, quota: 3 }),
    }));
    await page.goto('/');
    await page.click('[data-tpl="classic"]');
    // buka paywall dulu lewat template premium
    await page.click('[data-tpl="executive"]');
    await page.fill('#aktivasi-kode', 'CVK-TEST-1234');
    await page.click('#btn-aktivasi');
    await expect(page.locator('#premium-badge')).toBeVisible();
    await expect(page.locator('#paywall')).toBeHidden();
  });

  test('tombol AI tidak menampilkan paywall saat premium', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('cvkita_license_v1', 'CVK-64Y3-CT97'));
    await page.route('**/api/rewrite', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ result: 'Bullet baru dari AI', remaining: 2 }),
    }));
    await page.goto('/');
    await page.fill('[name="nama"]', 'Tes Premium');
    const entry = page.locator('#pengalaman-list .entry').first();
    await entry.locator('[name="pengalaman.deskripsi"]').fill('membuat laporan');
    await entry.locator('.btn-ai').click();
    await expect(page.locator('#paywall')).toBeHidden();
  });
});
