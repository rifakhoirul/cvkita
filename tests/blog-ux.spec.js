// QA 2026-09-29: UX indeks blog — seluruh kartu bisa diklik (bukan cuma judul) + pagination
import { test, expect } from '@playwright/test';

test('kartu artikel bisa diklik di area mana pun (bukan cuma judul)', async ({ page }) => {
  await page.goto('/blog/');
  const kartu = page.locator('.art').first();
  const link = kartu.locator('a.art-link');
  await expect(link).toHaveCount(1);
  // href mengarah ke artikel
  const href = await link.getAttribute('href');
  expect(href).toMatch(/^\/blog\/[a-z-]+\.html$/);
  // klik di area deskripsi (bukan judul) tetap berpindah
  await kartu.locator('p').click();
  await expect(page).toHaveURL(new RegExp(href.replace('/blog/', '') + '$'));
});

test('pagination: hanya 6 artikel per halaman, tombol halaman 2 ada', async ({ page }) => {
  await page.goto('/blog/');
  const total = await page.locator('.art').count();
  expect(total).toBeGreaterThan(6); // pastikan artikel bertambah seiring waktu
  const visible = await page.locator('.art:visible').count();
  expect(visible).toBeLessThanOrEqual(6);
  await expect(page.locator('.page-nav')).toBeVisible();
  await expect(page.locator('[data-page="2"]')).toBeVisible();
});

test('klik halaman 2 → artikel berbeda tampil, tombol kembali ke 1', async ({ page }) => {
  await page.goto('/blog/');
  const firstTitle = await page.locator('.art:visible h2').first().innerText();
  await page.locator('[data-page="2"]').click();
  const secondTitle = await page.locator('.art:visible h2').first().innerText();
  expect(secondTitle).not.toBe(firstTitle);
  await expect(page.locator('[data-page="1"]')).toBeVisible();
});
