import { test, expect } from '@playwright/test';

// Fitur Translate CV -> English (30 Sep). 1 kuota AI per section, premium-only.
// 30 Sep (rev): tombol Improve & Translate digabung jadi SATU tombol AI per lokasi.
// Klik -> pre-check kuota (tanpa memotong kuota) -> modal pilihan Improve / Translate.
// Endpoint Worker di-mock di level route supaya test frontend tetap deterministik.

const LICENSE = 'CVK-TEST-TRAN';

async function seedPremium(page) {
  await page.addInitScript((lic) => {
    localStorage.setItem('cvkita_license_v1', lic);
  }, LICENSE);
}

async function mockVerify(page, { valid = true, quota = 3 } = {}) {
  await page.route('**/api/license/verify', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid, quota }) }));
}

async function mockTranslate(page, { status = 200, result = 'Managed monthly warehouse stock using spreadsheet systems.' } = {}) {
  await page.route('**/api/translate', route => {
    if (status !== 200) {
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ error: 'Kuota AI-mu sudah habis.' }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result, remaining: 2 }) });
  });
}

test.describe('Tombol AI terpadu (Improve / Translate)', () => {
  test('ringkasan & tiap entri pengalaman punya SATU tombol AI (bukan dua)', async ({ page }) => {
    await seedPremium(page);
    await mockVerify(page);
    await page.goto('/');
    await expect(page.locator('#btn-ai-ringkasan')).toBeVisible();
    // tombol ringkasan bukan tombol translate terpisah lagi
    await expect(page.locator('#btn-translate-ringkasan')).toHaveCount(0);
    await page.click('[data-add="pengalaman"]');
    const entryCount = await page.locator('#pengalaman-list .entry').count();
    await expect(page.locator('#pengalaman-list .entry .btn-ai')).toHaveCount(entryCount);
    await expect(page.locator('#pengalaman-list .entry .btn-translate')).toHaveCount(0);
  });

  test('premium + kuota: klik -> modal pilihan Improve / Translate muncul', async ({ page }) => {
    await seedPremium(page);
    await mockVerify(page, { valid: true, quota: 2 });
    await page.goto('/');
    await page.fill('[name="ringkasan"]', 'Lulusan Sistem Informasi.');
    await page.click('#btn-ai-ringkasan');
    const modal = page.locator('#ai-choice-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(/improve/i);
    await expect(modal).toContainText(/translate/i);
  });

  test('pre-check: bukan premium -> paywall, modal tidak muncul, API AI tidak dipanggil', async ({ page }) => {
    let aiCalled = false;
    await page.route('**/api/translate', route => { aiCalled = true; route.fulfill({ status: 200, body: '{}' }); });
    await page.route('**/api/rewrite', route => { aiCalled = true; route.fulfill({ status: 200, body: '{}' }); });
    await mockVerify(page);
    await page.goto('/');
    await page.click('[data-add="pengalaman"]');
    await page.fill('[name="pengalaman.deskripsi"]', 'Mengelola stok gudang.');
    await page.locator('#pengalaman-list .entry .btn-ai').last().click();
    await expect(page.locator('#paywall')).toBeVisible();
    await expect(page.locator('#ai-choice-modal')).toBeHidden();
    expect(aiCalled).toBe(false);
  });

  test('pre-check: kuota habis (verify quota 0) -> modal kuota, bukan modal pilihan', async ({ page }) => {
    await seedPremium(page);
    await mockVerify(page, { valid: false, quota: 0 });
    await page.goto('/');
    await page.fill('[name="ringkasan"]', 'Lulusan Sistem Informasi.');
    await page.click('#btn-ai-ringkasan');
    await expect(page.locator('#quota-modal')).toBeVisible();
    await expect(page.locator('#ai-choice-modal')).toBeHidden();
  });

  test('modal: pilih Translate -> API translate dipanggil, field tertimpa hasil', async ({ page }) => {
    await seedPremium(page);
    await mockVerify(page);
    await mockTranslate(page);
    await page.goto('/');
    await page.fill('[name="ringkasan"]', 'Lulusan Sistem Informasi dengan pengalaman magang analisis data.');
    await page.click('#btn-ai-ringkasan');
    await page.click('#btn-ai-translate');
    await expect(page.locator('[name="ringkasan"]')).toHaveValue(/Managed monthly warehouse stock/);
    await expect(page.locator('#ai-choice-modal')).toBeHidden();
  });

  test('modal: pilih Improve -> API rewrite dipanggil, field tertimpa hasil', async ({ page }) => {
    await seedPremium(page);
    await mockVerify(page);
    await page.route('**/api/rewrite', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: 'Fresh graduate Sistem Informasi yang berorientasi data.', remaining: 2 }) }));
    await page.goto('/');
    await page.fill('[name="ringkasan"]', 'Lulusan Sistem Informasi.');
    await page.click('#btn-ai-ringkasan');
    await page.click('#btn-ai-improve');
    await expect(page.locator('[name="ringkasan"]')).toHaveValue(/Fresh graduate Sistem Informasi/);
  });

  test('modal bisa ditutup (X / klik luar / Escape) tanpa aksi', async ({ page }) => {
    await seedPremium(page);
    await mockVerify(page);
    await page.goto('/');
    await page.fill('[name="ringkasan"]', 'Lulusan Sistem Informasi.');
    await page.click('#btn-ai-ringkasan');
    await expect(page.locator('#ai-choice-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#ai-choice-modal')).toBeHidden();
  });
});
