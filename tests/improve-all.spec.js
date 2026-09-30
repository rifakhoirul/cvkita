// QA 2026-09-29: tombol "Improve seluruh CV dengan AI" di akhir form
import { test, expect } from '@playwright/test';

test('tombol improve-all ada di akhir form; tanpa lisensi → paywall muncul', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('#btn-improve-all');
  await expect(btn).toBeVisible();
  // posisi: setelah section 6 (Prestasi) — tombol elemen terakhir sebelum </form>
  const btnBox = await btn.boundingBox();
  const lastDetails = page.locator('#cv-form details').last();
  const detBox = await lastDetails.boundingBox();
  expect(btnBox.y).toBeGreaterThan(detBox.y);
  // Tanpa lisensi: klik → paywall
  await btn.click();
  await expect(page.locator('#paywall')).toBeVisible();
});

test('dengan lisensi: klik → API dipanggil → modal bandingkan muncul; tolak → CV asli tetap', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('cvkita_license_v1', 'CVK-FAKE-CODE'));
  // Isi data CV dulu
  await page.fill('[name="nama"]', 'Rania');
  await page.fill('[name="ringkasan"]', 'Saya lulusan SI yang rajin.');
  await page.route('**/api/improve-all', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      improved: true,
      fields: { nama: 'Rania', ringkasan: 'Lulusan S1 Sistem Informasi dengan fokus pengembangan web yang terbukti.' },
      pengalaman: [{ posisi: '', organisasi: '', periode: '', deskripsi: '' }],
    }),
  }));
  await page.route('**/api/license/verify', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, quota: 3 }),
  }));
  await page.click('#btn-improve-all');
  // modal pilihan bahasa muncul dulu → pilih Indonesia
  const langModal = page.locator('#improve-lang-modal');
  await expect(langModal).toBeVisible();
  await page.click('#btn-improve-lang-id');
  const modal = page.locator('.improve-confirm');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Saya lulusan SI yang rajin.');
  await expect(modal).toContainText('Lulusan S1 Sistem Informasi');
  // Klik "Pertahankan punyaku" → CV tidak berubah
  await modal.locator('[data-no]').click();
  await expect(modal).toBeHidden();
  await expect(page.locator('[name="ringkasan"]')).toHaveValue('Saya lulusan SI yang rajin.');
});

test('terima hasil AI → field ringkasan diperbarui', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('cvkita_license_v1', 'CVK-FAKE-CODE'));
  await page.fill('[name="ringkasan"]', 'versi lama');
  await page.route('**/api/improve-all', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ improved: true, fields: { nama: '', ringkasan: 'versi AI yang jauh lebih baik' }, remaining: 2 }),
  }));
  await page.route('**/api/license/verify', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, quota: 3 }),
  }));
  await page.click('#btn-improve-all');
  await page.click('#btn-improve-lang-id');
  await page.locator('.improve-confirm [data-yes]').click();
  await expect(page.locator('[name="ringkasan"]')).toHaveValue('versi AI yang jauh lebih baik');
  // badge header ikut sisa kuota terbaru
  await expect(page.locator('#premium-badge')).toContainText('2×');
});

test('pilih bahasa Inggris → body english:true', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('cvkita_license_v1', 'CVK-FAKE-CODE'));
  await page.fill('[name="ringkasan"]', 'versi lama');
  let body = null;
  await page.route('**/api/improve-all', route => {
    body = JSON.parse(route.request().postData() || '{}');
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ improved: true, fields: { nama: '', ringkasan: 'A much better AI version' }, remaining: 2 }),
    });
  });
  await page.route('**/api/license/verify', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, quota: 3 }),
  }));
  await page.click('#btn-improve-all');
  await page.click('#btn-improve-lang-en');
  await page.locator('.improve-confirm [data-yes]').click();
  await expect(page.locator('[name="ringkasan"]')).toHaveValue('A much better AI version');
  expect(body.english).toBe(true);
});

test('kuota habis saat pre-check (verify quota 0) → modal kuota, API improve-all tidak dipanggil', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('cvkita_license_v1', 'CVK-FAKE-CODE'));
  let apiCalled = false;
  await page.route('**/api/improve-all', route => { apiCalled = true; route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Kuota AI-mu sudah habis.' }) }); });
  await page.route('**/api/license/verify', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ valid: false, quota: 0 }),
  }));
  await page.click('#btn-improve-all');
  await expect(page.locator('#quota-modal')).toBeVisible();
  await expect(page.locator('#improve-lang-modal')).toBeHidden();
  expect(apiCalled).toBe(false);
});

test('kuota habis → modal kuota muncul (bukan alert polos)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('cvkita_license_v1', 'CVK-FAKE-CODE'));
  await page.route('**/api/license/verify', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, quota: 1 }),
  }));
  await page.route('**/api/improve-all', route => route.fulfill({
    status: 403, contentType: 'application/json',
    body: JSON.stringify({ error: 'Kuota AI-mu sudah habis. Beli kode baru untuk lanjut.', quota: 0 }),
  }));
  await page.click('#btn-improve-all');
  await page.click('#btn-improve-lang-id');
  await expect(page.locator('#quota-modal')).toBeVisible();
});
