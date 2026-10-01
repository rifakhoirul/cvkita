// 1 Okt: owner ingin tahu berapa user import PDF & unduh PDF.
// Frontend memanggil beacon /api/track {event:'import_pdf'} saat import sukses
// dan {event:'download_pdf'} saat tombol Unduh PDF diklik.
import { test, expect } from '@playwright/test';

test('klik Unduh PDF mengirim beacon download_pdf', async ({ page }) => {
  const tracked = [];
  await page.route('**/api/track', async (route) => {
    tracked.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await page.goto('/');
  await page.locator('#btn-download').click();
  expect(tracked.some(t => t.event === 'download_pdf')).toBe(true);
});

test('import PDF sukses mengirim beacon import_pdf', async ({ page }) => {
  const tracked = [];
  await page.route('**/api/track', async (route) => {
    tracked.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await page.route('**/api/import-cv', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        nama: 'Budi Tes', headline: 'Fresh Graduate', email: '', telepon: '', kota: '',
        linkedin: '', ringkasan: 'Ringkasan tes.', pendidikan: [], pengalaman: [],
        project: [], keahlian: 'SQL', bahasa: '', prestasi: '',
      }),
    });
  });
  await page.goto('/');
  // set file input PDF kecil (ini bukan request CV — fixture test kosong)
  const pdf = Buffer.from('%PDF-1.4\n%test-fixture\n');
  await page.setInputFiles('#import-file', { name: 'cv.pdf', mimeType: 'application/pdf', buffer: pdf });
  await page.waitForTimeout(500);
  expect(tracked.some(t => t.event === 'import_pdf')).toBe(true);
});
