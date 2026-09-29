import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('memuat halaman dan preview kosong tampil', async ({ page }) => {
  await expect(page.locator('#cv-paper h1')).toHaveText('Nama Kamu');
});

test('mengetik nama langsung muncul di preview', async ({ page }) => {
  await page.fill('[name="nama"]', 'Budi Santoso');
  await expect(page.locator('#cv-paper h1')).toHaveText('Budi Santoso');
});

test('data tersimpan otomatis dan kembali setelah reload', async ({ page }) => {
  await page.fill('[name="nama"]', 'Siti Aminah');
  await page.reload();
  await expect(page.locator('#cv-paper h1')).toHaveText('Siti Aminah');
});

test('heading CV output berbahasa Inggris (ATS-ready)', async ({ page }) => {
  await page.fill('[name="keahlian"]', 'Python, SQL');
  await page.fill('[name="bahasa"]', 'Indonesian, English');
  const headings = await page.locator('#cv-paper h2').allTextContents();
  expect(headings).toContain('Skills');
  expect(headings).toContain('Languages');
});

test('tombol hapus menghapus entri pengalaman', async ({ page }) => {
  await page.click('[data-add="pengalaman"]');
  await expect(page.locator('#pengalaman-list .entry')).toHaveCount(2);
  await page.locator('#pengalaman-list .entry').last().locator('[data-del]').click();
  await expect(page.locator('#pengalaman-list .entry')).toHaveCount(1);
});

test('ganti template mengubah class preview', async ({ page }) => {
  await page.click('[data-tpl="classic"]');
  await page.click('.tpl-btn[data-tpl="modern"]');
  await expect(page.locator('#cv-paper')).toHaveClass(/tpl-modern/);
});

test('XSS: input berbahaya tidak dieksekusi', async ({ page }) => {
  await page.fill('[name="nama"]', '<img src=x onerror=alert(1)>');
  const imgCount = await page.locator('#cv-paper img').count();
  expect(imgCount).toBe(0);
});
