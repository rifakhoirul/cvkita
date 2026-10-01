import { test, expect } from '@playwright/test';

const REWRITE_RESULT = '• Mengelola kampanye media sosial dengan engagement naik 40%\n• Membuat laporan mingguan untuk tim manajemen';

async function mockApi(page, { licenseValid = true, rewrite = REWRITE_RESULT } = {}) {
  await page.route('**/api/license/verify', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ valid: licenseValid, quota: 3 }),
    })
  );
  await page.route('**/api/rewrite', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ result: rewrite }),
    })
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('tombol AI rewrite tersedia di entri pengalaman', async ({ page }) => {
  await expect(page.locator('#pengalaman-list .btn-ai').first()).toBeVisible();
});

test('klik AI rewrite tanpa lisensi menampilkan paywall dengan harga', async ({ page }) => {
  await mockApi(page);
  await page.locator('#pengalaman-list .btn-ai').first().click();
  await expect(page.locator('#paywall')).toBeVisible();
  await expect(page.locator('#paywall')).toContainText('Rp 9.900');
});



test('kode aktivasi invalid menampilkan pesan error', async ({ page }) => {
  await mockApi(page, { licenseValid: false });
  await page.locator('#pengalaman-list .btn-ai').first().click(); // buka paywall dulu
  await page.fill('#aktivasi-kode', 'KODE-PALSU');
  await page.click('#btn-aktivasi');
  await expect(page.locator('#aktivasi-error')).toContainText('tidak valid');
});

test('template premium terkunci sebelum aktivasi', async ({ page }) => {
  await mockApi(page);
  await page.click('[data-tpl="classic"]');
  const premium = page.locator('.tpl-btn[data-tpl="executive"]');
  await expect(premium).toHaveClass(/locked/);
  await premium.click();
  await expect(page.locator('#cv-paper')).not.toHaveClass(/tpl-executive/);
});

test('template premium bisa dipakai setelah aktivasi', async ({ page }) => {
  await mockApi(page);
  await page.locator('#pengalaman-list .btn-ai').first().click(); // buka paywall
  await page.fill('#aktivasi-kode', 'BOOST-TEST-123');
  await page.click('#btn-aktivasi');
  await page.click('[data-tpl="classic"]');
  await page.click('.tpl-btn[data-tpl="executive"]');
  await expect(page.locator('#cv-paper')).toHaveClass(/tpl-executive/);
});

test('API key tidak pernah tersimpan di localStorage', async ({ page }) => {
  await mockApi(page);
  await page.locator('#pengalaman-list .btn-ai').first().click(); // buka paywall
  await page.fill('#aktivasi-kode', 'BOOST-TEST-123');
  await page.click('#btn-aktivasi');
  const dump = await page.evaluate(() => JSON.stringify(localStorage));
  expect(dump).not.toMatch(/AIza|sk-|api[_-]?key/i);
});

test('aktivasi sukses lalu AI rewrite mengisi deskripsi pengalaman', async ({ page }) => {
  await mockApi(page);
  await page.locator('#pengalaman-list .btn-ai').first().click();
  await page.fill('#aktivasi-kode', 'BOOST-TEST-123');
  await page.click('#btn-aktivasi');
  await expect(page.locator('#paywall')).toBeHidden();
  await page.fill('[name="pengalaman.posisi"]', 'Magang Marketing');
  await page.locator('#pengalaman-list .btn-ai').first().click();
  await page.click('#btn-ai-improve');
  const desc = page.locator('[name="pengalaman.deskripsi"]').first();
  await expect(desc).toHaveValue(REWRITE_RESULT, { timeout: 5000 });
});
