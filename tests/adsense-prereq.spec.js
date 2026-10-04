// Prasyarat AdSense: privacy.html ada & menjelaskan cookie iklan; sitemap & robots.txt tersedia.
import { test, expect } from '@playwright/test';

test('privacy.html tampil, menjelaskan cookie iklan pihak ketiga (syarat AdSense)', async ({ page }) => {
  await page.goto('/privacy.html');
  const body = await page.locator('body').innerText();
  expect(body).toMatch(/Kebijakan Privasi/i);
  expect(body).toMatch(/cookie/i);
  expect(body).toMatch(/AdSense|Google/i);
  // opsi menonaktifkan personalisasi — link ke Pengaturan Iklan Google
  await expect(page.locator('a[href="https://adssettings.google.com"]')).toBeAttached();
});

test('terms.html memiliki link ke privacy.html', async ({ page }) => {
  await page.goto('/terms.html');
  const link = page.locator('a[href*="privacy"]');
  await expect(link.first()).toBeAttached();
});

test('sitemap.xml mendaftar halaman utama + semua artikel blog', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  const xml = await res.text();
  expect(xml).toContain('https://cvkita.id/');
  expect(xml).toContain('/blog/apa-itu-ats.html');
  expect(xml).toContain('/privacy.html');
  expect(xml).toContain('<urlset');
});

test('robots.txt mengizinkan crawl & menunjuk sitemap', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  const txt = await res.text();
  expect(txt).toContain('Allow: /');
  expect(txt).toContain('Sitemap: https://cvkita.id/sitemap.xml');
});
